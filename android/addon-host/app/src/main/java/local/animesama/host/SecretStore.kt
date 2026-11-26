package local.animesama.host

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecretStore(context: Context) {
    private val prefs = context.getSharedPreferences("private-host", Context.MODE_PRIVATE)
    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey("anime-host", null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("anime-host", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun load(): JSONObject = synchronized(storageLock) {
        val encoded = prefs.getString("config", null) ?: return@synchronized JSONObject()
        val bytes = Base64.decode(encoded, Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
        JSONObject(cipher.doFinal(bytes.copyOfRange(12, bytes.size)).toString(Charsets.UTF_8))
    }
    fun save(value: JSONObject) = synchronized(storageLock) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = cipher.iv + cipher.doFinal(value.toString().toByteArray(Charsets.UTF_8))
        check(prefs.edit().putString("config", Base64.encodeToString(encrypted, Base64.NO_WRAP)).commit())
    }
    fun tunnelIdentity(): String = synchronized(storageLock) {
        val saved = load()
        val privateKey = saved.optString("tunnelPrivateKey")
        val publicKey = saved.optString("tunnelPublicKey")
        if (privateKey.isNotBlank() && publicKey.isNotBlank()) return@synchronized publicKey
        check(privateKey.isBlank() && publicKey.isBlank()) // Never silently rotate a partial saved pair.
        val generated = TunnelIdentity.generate()
        saved.put("tunnelPrivateKey", generated.privateKey).put("tunnelPublicKey", generated.publicKey)
        save(saved)
        generated.publicKey
    }
    fun update(change: (JSONObject) -> Unit) = synchronized(storageLock) {
        val saved = load(); change(saved); save(saved)
    }
    @Suppress("ApplySharedPref") // Persist before starting/stopping the process or receiving boot.
    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) { prefs.edit().putBoolean("enabled", value).commit() }
    companion object { private val storageLock = Any(); fun newToken(): String = ByteArray(16).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it.toInt() and 255) } }
}
