package local.animesama.host

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Rect
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith

/** Disposable TV emulator only: real D-pad events, no personal configuration. */
@RunWith(AndroidJUnit4::class)
class TvNavigationTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private lateinit var scenario: ActivityScenario<MainActivity>
    @Before fun launch() {
        val context = instrumentation.targetContext
        assertTrue(context.packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK))
        context.stopService(Intent(context, HostService::class.java))
        SecretStore(context).apply {
            enabled = false
            save(JSONObject().put("settings", JSONObject().put("episodeMetadataSource", "native"))
                .put("token", "a".repeat(32)).put("lan", false))
        }
        scenario = ActivityScenario.launch(MainActivity::class.java); instrumentation.waitForIdleSync()
    }
    @After fun close() {
        scenario.close(); val context = instrumentation.targetContext
        SecretStore(context).enabled = false; context.stopService(Intent(context, HostService::class.java))
    }
    private fun key(code: Int) { instrumentation.sendKeyDownUpSync(code); instrumentation.waitForIdleSync() }
    private fun focus(id: Int) { scenario.onActivity { assertTrue(it.findViewById<View>(id).requestFocus()) }; instrumentation.waitForIdleSync() }
    private fun focused(id: Int) { scenario.onActivity {
        val view = it.findViewById<View>(id); assertTrue("Focus should reach $id", view.hasFocus())
        val visible = Rect(); assertTrue(view.getGlobalVisibleRect(visible)); assertTrue(visible.height() >= view.height - 2)
    } }
    private fun open(id: Int) { focus(id); key(KeyEvent.KEYCODE_DPAD_CENTER) }
    @Test fun dashboardAndTabsWorkWithRemoteAndCaptureScreen() {
        focused(R.id.add_addon)
        instrumentation.uiAutomation.takeScreenshot().let { bitmap ->
            java.io.File(instrumentation.targetContext.filesDir, "tv-ui.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }; bitmap.recycle()
        }
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(0x01010000)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.start_saved)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.stop_server)
        key(KeyEvent.KEYCODE_DPAD_UP); focused(R.id.start_saved)
        open(R.id.configure); focused(R.id.aio_manifest)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.xperience_manifest)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.tmdb_key)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.save_start)
    }
    @Test fun metadataTextIsVisibleAndUnsavedValuesSurviveRecreation() {
        open(R.id.configure)
        scenario.onActivity {
            val field = it.findViewById<EditText>(R.id.xperience_manifest)
            field.setText("https://fixture.example/private/manifest.json")
            assertEquals(0, it.window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE)
            assertEquals(field.text.toString(), field.transformationMethod?.getTransformation(field.text, field)?.toString() ?: field.text.toString())
        }
        scenario.recreate()
        scenario.onActivity { assertEquals("https://fixture.example/private/manifest.json", it.findViewById<EditText>(R.id.xperience_manifest).text.toString()) }
    }
    @Test fun remoteOpensKeyboardAndBackDoesNotTrapFocus() {
        open(R.id.configure); focused(R.id.aio_manifest); key(KeyEvent.KEYCODE_DPAD_CENTER)
        var shown = false; val deadline = android.os.SystemClock.elapsedRealtime() + 3_000
        while (!shown && android.os.SystemClock.elapsedRealtime() < deadline) {
            scenario.onActivity { shown = it.window.decorView.rootWindowInsets?.isVisible(android.view.WindowInsets.Type.ime()) == true }
            android.os.SystemClock.sleep(50)
        }
        assertTrue(shown); key(KeyEvent.KEYCODE_BACK); key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.xperience_manifest)
    }
    @Test fun metadataValidationPreservesSavedValuesAndNormalizesStremioLink() {
        open(R.id.configure)
        val before = SecretStore(instrumentation.targetContext).load().toString()
        scenario.onActivity { it.findViewById<EditText>(R.id.xperience_manifest).setText("invalid"); it.findViewById<View>(R.id.save_start).performClick() }
        instrumentation.waitForIdleSync(); assertEquals(before, SecretStore(instrumentation.targetContext).load().toString())
        key(KeyEvent.KEYCODE_BACK)
        scenario.onActivity { it.findViewById<EditText>(R.id.xperience_manifest).setText("stremio://fixture.example/x/manifest.json?sig=A%2Bb"); it.findViewById<View>(R.id.save_start).performClick() }
        instrumentation.waitForIdleSync()
        assertEquals("https://fixture.example/x/manifest.json?sig=A%2Bb", SecretStore(instrumentation.targetContext).load().getJSONObject("settings").getString("xperienceManifestUrl"))
    }
    @Test fun leanbackLauncherAndLegacyInstallationUrlSurviveBackgrounding() {
        val context = instrumentation.targetContext
        assertNotNull(context.packageManager.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER).setPackage(context.packageName), 0))
        open(R.id.start_saved)
        val deadline = android.os.SystemClock.elapsedRealtime() + 5_000
        while (!HostService.running && android.os.SystemClock.elapsedRealtime() < deadline) android.os.SystemClock.sleep(50)
        assertTrue(HostService.running); scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        val body = java.net.URL("http://127.0.0.1:8765/${"a".repeat(32)}/manifest.json").openConnection().apply { connectTimeout = 2_000; readTimeout = 2_000 }.getInputStream().bufferedReader().use { it.readText() }
        assertEquals("local.animesama.host", JSONObject(body).getString("id")); scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)
    }
    @Test fun sharedCredentialSavePreservesEncryptedSshIdentityAndLegacyToken() {
        val context = instrumentation.targetContext; val store = SecretStore(context)
        val key = store.tunnelIdentity(); val before = store.load().getString("tunnelPrivateKey")
        open(R.id.configure); open(R.id.save_start)
        assertEquals(before, store.load().getString("tunnelPrivateKey")); assertEquals(key, store.tunnelIdentity())
        assertEquals("a".repeat(32), HostedAddons.rows(store.load()).single().getString("token"))
        val encrypted = context.getSharedPreferences("private-host", android.content.Context.MODE_PRIVATE).getString("config", "")!!
        assertFalse(encrypted.contains("PRIVATE KEY")); assertFalse(encrypted.contains(key))
    }
    @Test fun invalidTunnelSetupDoesNotOverwriteWorkingLocalConfiguration() {
        open(R.id.tab_connection); val before = SecretStore(instrumentation.targetContext).load().toString()
        scenario.onActivity {
            it.findViewById<CheckBox>(R.id.remote_enabled).isChecked = true
            it.findViewById<EditText>(R.id.ngrok_domain).setText("https://invalid.example/path")
            it.findViewById<View>(R.id.save_start).performClick()
        }
        instrumentation.waitForIdleSync(); assertEquals(before, SecretStore(instrumentation.targetContext).load().toString()); key(KeyEvent.KEYCODE_BACK)
    }
    @Test fun remoteCanCreateEnAddonChooseManifestAndSaveWithoutRotatingAnimeUrl() {
        val store = SecretStore(instrumentation.targetContext)
        store.update { it.getJSONObject("settings").put("xperienceManifestUrl", "https://fixture.example/x/manifest.json") }
        open(R.id.add_addon)
        key(KeyEvent.KEYCODE_DPAD_DOWN); key(KeyEvent.KEYCODE_DPAD_DOWN); key(KeyEvent.KEYCODE_DPAD_CENTER)
        focused(R.id.addon_name)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.active_manifest)
        key(KeyEvent.KEYCODE_DPAD_CENTER); key(KeyEvent.KEYCODE_DPAD_UP); key(KeyEvent.KEYCODE_DPAD_DOWN); key(KeyEvent.KEYCODE_DPAD_CENTER)
        open(R.id.save_start)
        val rows = HostedAddons.rows(store.load()); assertEquals(2, rows.size)
        assertEquals("sources-en", rows[1].getString("family")); assertEquals("tvdb", rows[1].getJSONObject("options").getString("inputMetadataProvider"))
        assertEquals("a".repeat(32), rows[0].getString("token"))
    }
    @Test fun updatesScreenIsReachableAndDoesNotRequireRunningServer() {
        open(R.id.tab_updates); focused(R.id.check_updates)
        key(KeyEvent.KEYCODE_DPAD_DOWN); focused(R.id.rollback_engine)
        assertFalse(HostService.running)
        key(KeyEvent.KEYCODE_DPAD_UP); focused(R.id.check_updates)
    }
}
