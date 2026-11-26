package local.animesama.host

import com.jcraft.jsch.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.net.Socket
import java.net.InetSocketAddress
import java.io.IOException
import java.util.concurrent.Semaphore
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.ExecutionException
import java.security.MessageDigest
import java.util.Base64
import java.util.concurrent.atomic.AtomicBoolean

/** Never log/configure this object through data-class toString: it contains a private key. */
class TunnelConfig(val domain: String, val privateKey: String) {
    init { require(validDomain(domain)); require(privateKey.isNotBlank()) }
    companion object {
        fun validDomain(value: String): Boolean = value.length in 3..253 && value.contains('.') &&
            !Regex("^[0-9.]+$").matches(value) && value.split('.').all {
                it.length in 1..63 && Regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$").matches(it)
            }
        fun addonUrl(domain: String, token: String): String {
            require(validDomain(domain) && Regex("^[a-f0-9]{32}$").matches(token))
            return "https://$domain/$token/manifest.json"
        }
    }
}
class TunnelIdentity(val privateKey: String, val publicKey: String) {
    companion object {
        fun generate(): TunnelIdentity {
            val key = KeyPair.genKeyPair(JSch(), KeyPair.RSA, 3072)
            try {
                val privateBytes = ByteArrayOutputStream(); val publicBytes = ByteArrayOutputStream()
                key.writePrivateKey(privateBytes); key.writePublicKey(publicBytes, "Nuvio Android host")
                return TunnelIdentity(privateBytes.toString("UTF-8"), publicBytes.toString("UTF-8").trim())
            } finally { key.dispose() }
        }
    }
}
enum class TunnelCode { OFF, CONNECTING, CONNECTED, RETRY, AUTH_REQUIRED, KEY_UNAVAILABLE, HOST_IDENTITY_CHANGED, ENDPOINT_REFUSED, NETWORK_UNAVAILABLE }
data class TunnelStatus(val code: TunnelCode, val retrySeconds: Int = 0, val detail: String = "") {
    fun text(): String = (when(code) {
        TunnelCode.OFF -> "Remote access off"
        TunnelCode.CONNECTING -> "Tunnel connecting…"
        TunnelCode.CONNECTED -> "SSH tunnel connected · remote playback still depends on the video host"
        TunnelCode.RETRY -> "Tunnel disconnected · retry within ${retrySeconds}s"
        TunnelCode.KEY_UNAVAILABLE -> "Tunnel stopped: the saved app SSH key cannot be loaded"
        TunnelCode.AUTH_REQUIRED -> "Tunnel stopped: register this app’s public SSH key with ngrok"
        TunnelCode.HOST_IDENTITY_CHANGED -> "Tunnel stopped: ngrok server identity differs from the published key"
        TunnelCode.ENDPOINT_REFUSED -> "Tunnel stopped: ngrok endpoint setup failed"
        TunnelCode.NETWORK_UNAVAILABLE -> "Tunnel network unavailable"
    }) + if (detail.matches(Regex("(?:FORWARD_REQUEST|HTTP_COMMAND)(?: · ERR_NGROK_[0-9]{3,6})?"))) " · $detail" else ""
}
class TunnelFailure(val code: TunnelCode, val detail: String = "") : Exception(code.name)
interface TunnelConnection : AutoCloseable { fun run(config: TunnelConfig, connected: () -> Unit) }

/** Streaming recognizer: only an ngrok public error identifier can escape. */
internal class NgrokErrorCode : OutputStream() {
    private var prefix = ""
    private var digits = ""
    private var found = ""
    @Synchronized override fun write(value: Int) {
        val c = (value and 255).toChar()
        if (prefix == "ERR_NGROK_") {
            if (c in '0'..'9' && digits.length < 7) { digits += c; return }
            if (digits.length in 3..6) found = prefix + digits
            prefix = ""; digits = ""
        }
        val candidate = prefix + c
        prefix = if ("ERR_NGROK_".startsWith(candidate)) candidate else if (c == 'E') "E" else ""
    }
    @Synchronized fun detail(stage: String): String {
        val code = if (prefix == "ERR_NGROK_" && digits.length in 3..6) prefix + digits else found
        return stage + if (code.isNotEmpty()) " · $code" else ""
    }
}

/** One supervised session. Blocks on SSH input, with no app-side idle polling. */
class SshTunnelConnection internal constructor(
    private val host: String = "connect.eu.ngrok-agent.com", private val port: Int = 22,
    private val pin: String = "SHA256:OeywYk1/2w9cOg8Q3FjbsMOe2Hc9CvxbyBhDdUBBOlQ",
    private val remotePort: Int = 443, private val localPort: Int = 8765,
    private val testBind: String? = null,
) : TunnelConnection {
    private val closed = AtomicBoolean()
    private val forwardedSockets = Semaphore(8)
    @Volatile private var session: Session? = null
    @Volatile private var channel: ChannelExec? = null
    override fun run(config: TunnelConfig, connected: () -> Unit) {
        var pinRejected = false
        val remoteError = NgrokErrorCode()
        val forwarding = Executors.newSingleThreadExecutor { task -> Thread(task, "ngrok-forward-setup").apply { isDaemon = true } }
        val client = JSch()
        client.setHostKeyRepository(object : HostKeyRepository {
            override fun check(name: String, key: ByteArray): Int {
                val fingerprint = fingerprint(key)
                val ok = (name == host || name == "[$host]:$port") && MessageDigest.isEqual(fingerprint.toByteArray(), pin.toByteArray())
                if (!ok) pinRejected = true
                return if (ok) HostKeyRepository.OK else HostKeyRepository.CHANGED
            }
            override fun add(key: HostKey?, ui: UserInfo?) = Unit
            override fun remove(host: String?, type: String?) = Unit
            override fun remove(host: String?, type: String?, key: ByteArray?) = Unit
            override fun getKnownHostsRepositoryID() = "Pinned ngrok SSH identity"
            override fun getHostKey(): Array<HostKey> = emptyArray()
            override fun getHostKey(host: String?, type: String?): Array<HostKey> = emptyArray()
        })
        try {
            if (closed.get()) return
            try { client.addIdentity("android-host", config.privateKey.toByteArray(Charsets.UTF_8), null, null) }
            catch (_: Exception) { throw TunnelFailure(TunnelCode.KEY_UNAVAILABLE) }
            val ssh = client.getSession("v2", host, port)
            session = ssh
            if (closed.get()) return
            ssh.setConfig("StrictHostKeyChecking", "yes")
            ssh.setConfig("PreferredAuthentications", "publickey")
            ssh.setConfig("server_host_key", "rsa-sha2-512,rsa-sha2-256")
            ssh.setConfig("PubkeyAcceptedAlgorithms", "rsa-sha2-512,rsa-sha2-256")
            // All available through Android's standard JCE; no native/JDK15 EdDSA dependency.
            ssh.setConfig("kex", "ecdh-sha2-nistp256,diffie-hellman-group14-sha256")
            ssh.setConfig("cipher.c2s", "aes128-ctr,aes256-ctr"); ssh.setConfig("cipher.s2c", "aes128-ctr,aes256-ctr")
            ssh.setConfig("mac.c2s", "hmac-sha2-256"); ssh.setConfig("mac.s2c", "hmac-sha2-256")
            ssh.serverAliveInterval = 30_000; ssh.serverAliveCountMax = 3
            ssh.connect(15_000)
            if (closed.get()) return
            val forwardReady = forwarding.submit<Unit> { ssh.setPortForwardingR(testBind ?: config.domain, remotePort, "127.0.0.1", localPort, object : SocketFactory {
                override fun createSocket(target: String, targetPort: Int): Socket {
                    if (target != "127.0.0.1" || targetPort != localPort || !forwardedSockets.tryAcquire()) throw IOException("FORWARDING_BUSY")
                    val released = AtomicBoolean()
                    val socket = object : Socket() {
                        override fun close() { try { super.close() } finally { if (released.compareAndSet(false, true)) forwardedSockets.release() } }
                    }
                    try { socket.connect(InetSocketAddress("127.0.0.1", localPort), 2_000); socket.soTimeout = 70_000; return socket }
                    catch (e: Exception) { socket.close(); throw e }
                }
                override fun getInputStream(socket: Socket) = socket.getInputStream()
                override fun getOutputStream(socket: Socket) = socket.getOutputStream()
            }) }
            val command = ssh.openChannel("exec") as ChannelExec
            channel = command
            command.setCommand("http")
            command.setInputStream(null)
            command.setErrStream(remoteError)
            val input = command.inputStream
            // OpenSSH does not wait for tcpip-forward acknowledgement before exec.
            // Some gateways need BOTH requests to initialize the endpoint. JSch's
            // forwarding API blocks, so overlap only this bounded setup phase.
            command.connect(10_000)
            try { forwardReady.get(15, TimeUnit.SECONDS) }
            catch (error: ExecutionException) {
                if (!closed.get()) throw TunnelFailure(TunnelCode.ENDPOINT_REFUSED, remoteError.detail("FORWARD_REQUEST"))
                return
            }
            forwarding.shutdown() // Setup worker is not retained during an idle tunnel.
            if (closed.get()) return
            connected()
            val buffer = ByteArray(1024)
            // Drain but never store/log remote output: request paths may contain addon keys.
            while (!closed.get()) {
                val count = input.read(buffer)
                if (count < 0) break
                remoteError.write(buffer, 0, count)
            }
            if (!closed.get() && command.exitStatus > 0) throw TunnelFailure(TunnelCode.ENDPOINT_REFUSED, remoteError.detail("HTTP_COMMAND"))
        } catch (error: TunnelFailure) { throw error }
        catch (error: Exception) {
            if (closed.get()) return
            val code = when {
                pinRejected -> TunnelCode.HOST_IDENTITY_CHANGED
                error is JSchException && Regex("auth fail|auth cancel|USERAUTH fail", RegexOption.IGNORE_CASE).containsMatchIn(error.message.orEmpty()) -> TunnelCode.AUTH_REQUIRED
                else -> TunnelCode.NETWORK_UNAVAILABLE
            }
            throw TunnelFailure(code) // Raw exception text/keys/URLs never escape to the UI/logs.
        } finally {
            channel?.disconnect(); session?.disconnect()
            forwarding.shutdownNow()
            try { forwarding.awaitTermination(2, TimeUnit.SECONDS) }
            catch (_: InterruptedException) { Thread.currentThread().interrupt() }
            finally { client.removeAllIdentity() }
        }
    }
    override fun close() { closed.set(true); channel?.disconnect(); session?.disconnect() }
    companion object {
        fun fingerprint(blob: ByteArray): String = "SHA256:" + Base64.getEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(blob))
    }
}

/** Global single-attempt limit across repeated start/reconfigure; healthy sessions do no polling. */
class TunnelController(private val factory: () -> TunnelConnection = { SshTunnelConnection() },
                       private val firstRetryMs: Long = 5_000, private val maxRetryMs: Long = 60_000) : AutoCloseable {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val attempt = Mutex()
    private val lock = Any()
    private var generation = 0L
    private var job: Job? = null
    private var current: TunnelConnection? = null
    private var config: TunnelConfig? = null
    @Volatile var status = TunnelStatus(TunnelCode.OFF)
        private set
    init { require(firstRetryMs > 0 && maxRetryMs >= firstRetryMs) }
    fun start(value: TunnelConfig) = synchronized(lock) {
        stopLocked(); config = value
        val revision = generation
        status = TunnelStatus(TunnelCode.CONNECTING)
        job = scope.launch {
            attempt.withLock {
                var retry = firstRetryMs
                while (isActive) {
                    val connection = factory()
                    synchronized(lock) {
                        if (revision != generation) { connection.close(); return@launch }
                        current = connection
                    }
                    var connectedAt = 0L
                    var failure = TunnelCode.NETWORK_UNAVAILABLE
                    var detail = ""
                    try {
                        runInterruptible {
                            connection.run(value) {
                                connectedAt = System.nanoTime()
                                synchronized(lock) { if (revision == generation) status = TunnelStatus(TunnelCode.CONNECTED) }
                            }
                        }
                    } catch (e: CancellationException) { throw e }
                    catch (e: TunnelFailure) { failure = e.code; detail = e.detail }
                    catch (_: Exception) { failure = TunnelCode.NETWORK_UNAVAILABLE }
                    finally {
                        connection.close()
                        synchronized(lock) { if (current === connection) current = null }
                    }
                    synchronized(lock) {
                        if (revision != generation) return@launch
                        if (failure in setOf(TunnelCode.AUTH_REQUIRED, TunnelCode.KEY_UNAVAILABLE, TunnelCode.HOST_IDENTITY_CHANGED, TunnelCode.ENDPOINT_REFUSED)) {
                            status = TunnelStatus(failure, detail = detail); return@launch
                        }
                    }
                    if (connectedAt != 0L && System.nanoTime() - connectedAt >= 60_000_000_000L) retry = firstRetryMs
                    synchronized(lock) { if (revision == generation) status = TunnelStatus(TunnelCode.RETRY, ((retry + 999) / 1000).toInt()) }
                    delay(retry)
                    synchronized(lock) { if (revision == generation) status = TunnelStatus(TunnelCode.CONNECTING) }
                    retry = (retry * 2).coerceAtMost(maxRetryMs)
                }
            }
        }
    }
    fun networkAvailable() = synchronized(lock) { if (status.code == TunnelCode.RETRY) config?.let { start(it) }; Unit }
    fun networkLost() = synchronized(lock) { if (status.code in setOf(TunnelCode.CONNECTING, TunnelCode.CONNECTED, TunnelCode.RETRY)) config?.let { start(it) }; Unit }
    fun reconnect() = synchronized(lock) { config?.let { start(it) }; Unit }
    fun stop() = synchronized(lock) { stopLocked() }
    private fun stopLocked() { generation++; config = null; job?.cancel(); job = null; current?.close(); current = null; status = TunnelStatus(TunnelCode.OFF) }
    override fun close() { stop(); scope.cancel() }
}
