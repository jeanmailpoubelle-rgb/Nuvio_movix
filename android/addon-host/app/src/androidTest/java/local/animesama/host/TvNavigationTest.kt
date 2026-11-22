package local.animesama.host

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Rect
import android.view.KeyEvent
import android.view.WindowManager
import android.widget.EditText
import android.widget.Spinner
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith

/** Real remote key events on a TV image; synthetic local configuration only. */
@RunWith(AndroidJUnit4::class)
class TvNavigationTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private lateinit var scenario: ActivityScenario<MainActivity>
    @Before fun launch() {
        val context = instrumentation.targetContext
        assertTrue("Run on an Android TV emulator", context.packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK))
        context.stopService(Intent(context, HostService::class.java))
        SecretStore(context).apply {
            enabled = false
            save(JSONObject().put("settings", JSONObject().put("episodeMetadataSource", "native"))
                .put("token", "a".repeat(32)).put("lan", false))
        }
        scenario = ActivityScenario.launch(MainActivity::class.java)
        instrumentation.waitForIdleSync()
    }
    @After fun close() {
        scenario.close()
        val context = instrumentation.targetContext
        SecretStore(context).enabled = false
        context.stopService(Intent(context, HostService::class.java))
    }
    private fun key(code: Int) {
        instrumentation.sendKeyDownUpSync(code)
        instrumentation.waitForIdleSync()
    }
    private fun focused(id: Int) {
        scenario.onActivity {
            val view = it.findViewById<android.view.View>(id)
            assertTrue("Focus should reach ${it.getResources().getResourceEntryName(id)}", view.hasFocus())
            val visible = Rect()
            assertTrue("Focused control must be on screen", view.getGlobalVisibleRect(visible))
            assertTrue("Focused control must be fully visible", visible.height() >= view.height - 2)
        }
    }
    @Test fun remoteReachesEverySettingAndActionInBothDirections() {
        focused(R.id.configure)
        instrumentation.uiAutomation.takeScreenshot().let { bitmap ->
            java.io.File(instrumentation.targetContext.filesDir, "tv-ui.png").outputStream().use {
                bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
            }
            bitmap.recycle()
        }
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        val order = listOf(R.id.aio_manifest, R.id.xperience_manifest, R.id.active_manifest,
            R.id.mapping_mode, R.id.episode_order, R.id.editions, R.id.tmdb_key, R.id.lan_access,
            R.id.save_start, R.id.local_url, R.id.lan_url, R.id.stop_server)
        for (id in order) { focused(id); if (id != order.last()) key(KeyEvent.KEYCODE_DPAD_DOWN) }
        for (id in order.dropLast(1).reversed()) { key(KeyEvent.KEYCODE_DPAD_UP); focused(id) }
    }
    @Test fun remoteSelectsManifestAndRestoresUnsavedFields() {
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        key(KeyEvent.KEYCODE_DPAD_DOWN)
        key(KeyEvent.KEYCODE_DPAD_DOWN)
        focused(R.id.active_manifest)
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        key(KeyEvent.KEYCODE_DPAD_DOWN)
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        scenario.onActivity {
            assertEquals(1, it.findViewById<Spinner>(R.id.active_manifest).selectedItemPosition)
            it.findViewById<EditText>(R.id.xperience_manifest).setText("https://fixture.example/private/manifest.json")
            assertEquals(0, it.window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE)
            val field = it.findViewById<EditText>(R.id.xperience_manifest)
            val rendered = field.transformationMethod?.getTransformation(field.text, field)?.toString() ?: field.text.toString()
            assertEquals("The manifest must remain visible rather than masked", field.text.toString(), rendered)
        }
        scenario.recreate()
        scenario.onActivity {
            assertEquals("https://fixture.example/private/manifest.json", it.findViewById<EditText>(R.id.xperience_manifest).text.toString())
            assertEquals(1, it.findViewById<Spinner>(R.id.active_manifest).selectedItemPosition)
        }
    }
    @Test fun remoteOpensAndDismissesKeyboardWithoutTrappingFocus() {
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        focused(R.id.aio_manifest)
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        var shown = false
        val limit = android.os.SystemClock.elapsedRealtime() + 3_000
        while (!shown && android.os.SystemClock.elapsedRealtime() < limit) {
            scenario.onActivity { shown = it.window.decorView.rootWindowInsets?.isVisible(android.view.WindowInsets.Type.ime()) == true }
            android.os.SystemClock.sleep(50)
        }
        assertTrue("OK should open the TV keyboard", shown)
        key(KeyEvent.KEYCODE_BACK)
        key(KeyEvent.KEYCODE_DPAD_DOWN)
        focused(R.id.xperience_manifest)
    }
    @Test fun saveReportsSelectedFieldAndAcceptsStremioManifest() {
        scenario.onActivity {
            it.findViewById<Spinner>(R.id.mapping_mode).setSelection(0)
            it.findViewById<Spinner>(R.id.active_manifest).setSelection(1)
            it.findViewById<EditText>(R.id.aio_manifest).setText("https://fixture.example/aio/manifest.json")
            it.findViewById<android.view.View>(R.id.save_start).performClick()
        }
        instrumentation.waitForIdleSync()
        key(KeyEvent.KEYCODE_BACK)
        scenario.onActivity {
            assertTrue(it.findViewById<EditText>(R.id.xperience_manifest).error.toString().contains("Xperience is selected"))
            it.findViewById<EditText>(R.id.xperience_manifest).setText("stremio://fixture.example/x/manifest.json?sig=A%2Bb")
            it.findViewById<android.view.View>(R.id.save_start).performClick()
        }
        instrumentation.waitForIdleSync()
        val saved = SecretStore(instrumentation.targetContext).load()
        assertEquals("https://fixture.example/x/manifest.json?sig=A%2Bb", saved.getJSONObject("settings").getString("xperienceManifestUrl"))
    }
    @Test fun leanbackLauncherAndBackgroundServerWorkWithoutTouch() {
        val context = instrumentation.targetContext
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER).setPackage(context.packageName)
        assertNotNull(context.packageManager.resolveActivity(intent, 0))
        focused(R.id.configure)
        key(KeyEvent.KEYCODE_DPAD_DOWN)
        focused(R.id.start_saved)
        key(KeyEvent.KEYCODE_DPAD_CENTER)
        val limit = android.os.SystemClock.elapsedRealtime() + 5_000
        while (!HostService.running && android.os.SystemClock.elapsedRealtime() < limit) android.os.SystemClock.sleep(50)
        assertTrue("Remote starts the saved local server", HostService.running)
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED)
        val body = java.net.URL("http://127.0.0.1:8765/${"a".repeat(32)}/manifest.json").openConnection().apply {
            connectTimeout = 2_000; readTimeout = 2_000
        }.getInputStream().bufferedReader().use { it.readText() }
        assertEquals("local.animesama.host", JSONObject(body).getString("id"))
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED)
    }
}
