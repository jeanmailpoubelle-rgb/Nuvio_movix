package local.animesama.host

import org.json.JSONObject
import org.junit.Test
import kotlin.test.*

class ConfigurationTest {
    @Test fun installationSchemePreservesPrivatePathAndQueryBytes() {
        val url = "stremio://fixture.example/config/Ab%2FC/manifest.json?sig=A%2Bb&x=1&x=2"
        val config = HostConfig(JSONObject().put("inputMetadataAdapter", "xperience").put("xperienceManifestUrl", "  $url  "))
        assertEquals(url.replace("stremio://", "https://"), config.settings.getString("xperienceManifestUrl"))
        assertTrue(config.metadataUrls().single().startsWith("https://"))
    }
    @Test fun wrongSelectedSlotNamesTheEmptySlotWithoutSubstitution() {
        val error = assertFailsWith<ConfigurationException> {
            HostConfig(JSONObject().put("inputMetadataAdapter", "xperience").put("aiometadataSavedManifestUrl", "https://aio.example/private/manifest.json"))
        }
        assertEquals("xperienceManifestUrl", error.field)
        assertEquals("MISSING_SELECTED", error.problem)
    }
    @Test fun invalidUrisAndPluginManifestsHaveSafeFieldSpecificErrors() {
        for (url in listOf("https://example.org/private SECRET/manifest.json", "https://user:SECRET@example.org/manifest.json", "http://example.org/SECRET/manifest.json", "https://example.org/SECRET/configure")) {
            val error = assertFailsWith<ConfigurationException> { HostConfig(JSONObject().put("aiometadataSavedManifestUrl",url)) }
            assertEquals("aiometadataSavedManifestUrl", error.field)
            assertEquals("INVALID_URL", error.problem)
            assertFalse(error.toString().contains("SECRET"))
        }
        val error = assertFailsWith<ConfigurationException> { HostConfig(JSONObject().put("aiometadataSavedManifestUrl","https://raw.githubusercontent.com/owner/repo/main/manifest.json")) }
        assertEquals("PLUGIN_MANIFEST", error.problem)
    }
    @Test fun nativeConfigDoesNotRequireManifestsOrPretendToVerifyApiKey() {
        val config = HostConfig(JSONObject().put("episodeMetadataSource", "native"), "not-verified-during-save")
        assertEquals("not-verified-during-save", config.tmdbKey)
    }
}
