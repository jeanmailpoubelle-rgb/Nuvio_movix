package local.animesama.host

import kotlin.test.*
import org.junit.Test
import org.apache.sshd.server.SshServer
import org.apache.sshd.server.command.Command
import org.apache.sshd.server.channel.ChannelSession
import org.apache.sshd.server.Environment
import org.apache.sshd.server.ExitCallback
import org.apache.sshd.common.keyprovider.KeyPairProvider
import org.apache.sshd.common.config.keys.PublicKeyEntry
import org.apache.sshd.server.forward.AcceptAllForwardingFilter
import java.io.InputStream
import java.io.OutputStream
import java.net.ServerSocket
import java.net.HttpURLConnection
import java.util.Base64
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.*
import org.json.JSONObject

class RemoteTunnelTest {
    private class HoldCommand : Command {
        private var output: OutputStream? = null
        private var exit: ExitCallback? = null
        override fun setInputStream(value: InputStream) = Unit
        override fun setOutputStream(value: OutputStream) { output = value }
        override fun setErrorStream(value: OutputStream) = Unit
        override fun setExitCallback(value: ExitCallback) { exit = value }
        override fun start(channel: ChannelSession, env: Environment) { output?.write("Forwarding\n".toByteArray()); output?.flush() }
        override fun destroy(channel: ChannelSession) { exit?.onExit(0) }
    }
    @Test fun realSshAuthenticatesPinsAndForwardsOnlyToTokenProtectedLocalAddon() = realSsh(false)
    @Test fun forwardingReplyMayWaitForHttpCommandWithoutDeadlocking() = realSsh(true)
    private fun realSsh(delayForwardReply: Boolean) {
        val identity = TunnelIdentity.generate()
        assertTrue(identity.publicKey.startsWith("ssh-rsa "))
        assertFalse(identity.toString().contains("PRIVATE KEY"))
        val hostKey = java.security.KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val pin = SshTunnelConnection.fingerprint(Base64.getDecoder().decode(PublicKeyEntry.toString(hostKey.public).split(' ')[1]))
        val commands = mutableListOf<String>()
        val auth = AtomicInteger()
        val commandStarted = CountDownLatch(1)
        val delayedReply = Executors.newSingleThreadExecutor()
        val ssh = SshServer.setUpDefaultServer().apply {
            host = "127.0.0.1"; port = 0
            keyPairProvider = KeyPairProvider.wrap(hostKey)
            publickeyAuthenticator = org.apache.sshd.server.auth.pubkey.PublickeyAuthenticator { user, key, _ ->
                auth.incrementAndGet(); user == "v2" && PublicKeyEntry.toString(key) == identity.publicKey.substringBefore(" Nuvio")
            }
            forwardingFilter = AcceptAllForwardingFilter.INSTANCE
            commandFactory = org.apache.sshd.server.command.CommandFactory { _, command -> commands.add(command); commandStarted.countDown(); HoldCommand() }
            if (delayForwardReply) {
                val deferred = org.apache.sshd.common.channel.RequestHandler<org.apache.sshd.common.session.ConnectionService> { service, request, wantReply, buffer ->
                    if (request != "tcpip-forward") org.apache.sshd.common.channel.RequestHandler.Result.Unsupported
                    else {
                        val copy = org.apache.sshd.common.util.buffer.ByteArrayBuffer(buffer.compactData)
                        delayedReply.submit {
                            check(commandStarted.await(5, TimeUnit.SECONDS)) { "HTTP command blocked behind forward reply" }
                            org.apache.sshd.server.global.TcpipForwardHandler.INSTANCE.process(service, request, wantReply, copy)
                        }
                        org.apache.sshd.common.channel.RequestHandler.Result.Replied
                    }
                }
                globalRequestHandlers = listOf(deferred) + globalRequestHandlers
            }
        }
        val addon = AddonServer(Engine("async function getStreams(){return []}"), HostConfig(JSONObject().put("episodeMetadataSource", "native")), "a".repeat(32), port=0)
        val localPort = addon.start()
        ssh.start()
        val remotePort = ServerSocket(0).use { it.localPort }
        val connection = SshTunnelConnection("127.0.0.1", ssh.port, pin, remotePort, localPort, "127.0.0.1")
        val executor = Executors.newSingleThreadExecutor()
        try {
            val config = TunnelConfig("pixel-example.ngrok-free.app", identity.privateKey)
            val ready = CountDownLatch(1)
            val future = executor.submit { connection.run(config) { ready.countDown() } }
            assertTrue(ready.await(10, TimeUnit.SECONDS))
            fun request(token: String): Pair<Int,String> {
                val c=java.net.URI("http://127.0.0.1:$remotePort/$token/manifest.json").toURL().openConnection() as HttpURLConnection
                c.connectTimeout=3000; c.readTimeout=3000
                return try { c.responseCode to (if(c.responseCode==200)c.inputStream.bufferedReader().readText() else "") } finally { c.disconnect() }
            }
            assertEquals(404, request("b".repeat(32)).first)
            val result=request("a".repeat(32)); assertEquals(200,result.first); assertEquals("0.2.2",JSONObject(result.second).getString("version"))
            assertEquals(listOf("http"), commands)
            assertTrue(auth.get()>0)
            connection.close(); future.get(3,TimeUnit.SECONDS)
            val local=java.net.URI("http://127.0.0.1:$localPort/${"a".repeat(32)}/manifest.json").toURL().openConnection() as HttpURLConnection
            try { assertEquals(200,local.responseCode) } finally { local.disconnect() }
            val before=auth.get()
            val untrusted=SshTunnelConnection("127.0.0.1",ssh.port,"SHA256:wrong",remotePort,localPort,"127.0.0.1")
            try { assertEquals(TunnelCode.HOST_IDENTITY_CHANGED,assertFailsWith<TunnelFailure> { untrusted.run(config) {} }.code) }
            finally { untrusted.close() }
            assertEquals(before,auth.get(),"Wrong host must stop before public-key authentication")
        } finally { connection.close(); executor.shutdownNow(); addon.close(); ssh.stop(true); delayedReply.shutdownNow() }
    }
    @Test fun remoteDiagnosticsExposeOnlyStageAndPublicNgrokCode() {
        val output = NgrokErrorCode()
        val raw = "private-path secret-token https://private.example/secret ERR_NGROK_334\nmore secret"
        for (byte in raw.toByteArray()) output.write(byte.toInt())
        assertEquals("HTTP_COMMAND · ERR_NGROK_334", output.detail("HTTP_COMMAND"))
        val shown = TunnelStatus(TunnelCode.ENDPOINT_REFUSED, detail = output.detail("HTTP_COMMAND")).text()
        assertTrue(shown.contains("ERR_NGROK_334")); assertFalse(shown.contains("secret"))
        assertFalse(TunnelStatus(TunnelCode.ENDPOINT_REFUSED, detail = raw).text().contains("secret"))
        val incomplete = NgrokErrorCode(); incomplete.write("ERR_NGROK_12345678 ".toByteArray())
        assertEquals("FORWARD_REQUEST", incomplete.detail("FORWARD_REQUEST"))
    }
    @Test fun rejectsUnsafeDomainAndPreservesExistingPrivateUrlToken() {
        for(domain in listOf("https://example.ngrok.app","bad..ngrok.app","-Ranything","example.ngrok.app/token","127.0.0.1","x.ngrok.app\nother"))
            assertFailsWith<IllegalArgumentException> { TunnelConfig(domain,"private") }
        val token="ab".repeat(16)
        assertEquals("https://pixel-example.ngrok-free.app/$token/manifest.json",TunnelConfig.addonUrl("pixel-example.ngrok-free.app",token))
        assertFalse(TunnelConfig("pixel-example.ngrok-free.app","PRIVATE_SENTINEL").toString().contains("PRIVATE_SENTINEL"))
    }
    private suspend fun eventually(test: () -> Boolean) { withTimeout(3000) { while(!test())delay(5) } }
    @Test fun retriesNetworkFailureButStopsOnAuthenticationAndExplicitStop() = runBlocking {
        val attempts=AtomicInteger(); val closed=CountDownLatch(1)
        val controller=TunnelController(factory={object:TunnelConnection {
            override fun run(config:TunnelConfig,connected:()->Unit) {
                if(attempts.incrementAndGet()<3)throw TunnelFailure(TunnelCode.NETWORK_UNAVAILABLE)
                connected(); closed.await()
            }
            override fun close(){if(attempts.get()>=3)closed.countDown()}
        }},firstRetryMs=10,maxRetryMs=20)
        try {
            controller.start(TunnelConfig("pixel-example.ngrok-free.app","private"))
            eventually { controller.status.code==TunnelCode.CONNECTED }
            assertEquals(3,attempts.get())
            controller.stop(); controller.networkAvailable(); delay(40)
            assertEquals(TunnelCode.OFF,controller.status.code);assertEquals(3,attempts.get())
        } finally { controller.close() }
        val authAttempts=AtomicInteger()
        val denied=TunnelController(factory={object:TunnelConnection {
            override fun run(config:TunnelConfig,connected:()->Unit){authAttempts.incrementAndGet();throw TunnelFailure(TunnelCode.AUTH_REQUIRED)}
            override fun close()=Unit
        }},firstRetryMs=5,maxRetryMs=10)
        try {
            denied.start(TunnelConfig("pixel-example.ngrok-free.app","private"));eventually { denied.status.code==TunnelCode.AUTH_REQUIRED }
            denied.networkLost();denied.networkAvailable();delay(40);assertEquals(1,authAttempts.get())
        } finally { denied.close() }
    }
    @Test fun repeatedReconfigurationNeverOverlapsAttemptsAndStaleCallbacksCannotRestartStoppedTunnel() = runBlocking {
        val active=AtomicInteger();val peak=AtomicInteger()
        val controller=TunnelController(factory={object:TunnelConnection {
            private val done=CountDownLatch(1)
            override fun run(config:TunnelConfig,connected:()->Unit) {
                val n=active.incrementAndGet();peak.updateAndGet{maxOf(it,n)}
                try { connected();done.await() } finally { active.decrementAndGet() }
            }
            override fun close(){done.countDown()}
        }},firstRetryMs=10,maxRetryMs=20)
        try {
            repeat(12){controller.start(TunnelConfig("pixel-$it.ngrok-free.app","private"))}
            eventually { controller.status.code==TunnelCode.CONNECTED }
            controller.stop();eventually { active.get()==0 };delay(30)
            assertEquals(1,peak.get());assertEquals(TunnelCode.OFF,controller.status.code)
        } finally { controller.close() }
    }
    @Test fun invalidPrivateKeyStopsBeforeAnyNetworkAttempt() {
        val connection=SshTunnelConnection()
        try { assertEquals(TunnelCode.KEY_UNAVAILABLE,assertFailsWith<TunnelFailure>{connection.run(TunnelConfig("pixel-example.ngrok-free.app","not-a-key")) { fail("Must not connect") }}.code) }
        finally { connection.close() }
    }
    @Test fun availableNetworkWakesBackoffAndLateConnectedCallbackCannotUndoStop() = runBlocking {
        val count=AtomicInteger();val entered=CountDownLatch(1);val unblock=CountDownLatch(1);val finished=CountDownLatch(1)
        val controller=TunnelController(factory={object:TunnelConnection {
            override fun run(config:TunnelConfig,connected:()->Unit) {
                if(count.incrementAndGet()==1)throw TunnelFailure(TunnelCode.NETWORK_UNAVAILABLE)
                entered.countDown()
                try { unblock.await() } catch (_:InterruptedException) { }
                connected();finished.countDown()
            }
            override fun close(){if(count.get()>1)unblock.countDown()}
        }},firstRetryMs=60_000,maxRetryMs=60_000)
        try {
            controller.start(TunnelConfig("pixel-example.ngrok-free.app","private"));eventually { controller.status.code==TunnelCode.RETRY }
            controller.networkAvailable();assertTrue(entered.await(2,TimeUnit.SECONDS))
            controller.stop();assertTrue(finished.await(2,TimeUnit.SECONDS));delay(20)
            assertEquals(TunnelCode.OFF,controller.status.code);assertEquals(2,count.get())
        } finally { controller.close() }
    }

}
