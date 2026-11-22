package local.animesama.host

import kotlinx.coroutines.runBlocking
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Test
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.test.*

class IdentityTest {
    private fun configured(key: String = "fixture-key") = HostConfig(JSONObject()
        .put("episodeMetadataSource", "aiometadata").put("inputMetadataAdapter", "xperience")
        .put("xperienceManifestUrl", "https://xp.example/config/manifest.json"), key)
    private fun response(request: Request, body: String, status: Int = 200, type: String = "application/json") =
        Response.Builder().request(request).protocol(Protocol.HTTP_1_1).code(status).message("Fixture")
            .header("Content-Type", type).body(body.toResponseBody(type.toMediaType())).build()

    @Test fun imdbIdentityIsCachedAndCoordinatesAreNotTranslatedHere() = runBlocking<Unit> {
        val requests = CopyOnWriteArrayList<Request>()
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            requests.add(chain.request())
            response(chain.request(), """{"tv_results":[{"id":46298}],"movie_results":[{"id":999}]}""")
        }.build()
        val bridge = HttpBridge(client = client)
        try {
            val request = EpisodeRequest("tt2098220", "tv", 2, 72)
            assertEquals(request.copy(id = "46298"), SeriesIdentity.resolve(request, configured(), bridge))
            SeriesIdentity.resolve(request.copy(episode = 1), configured(), bridge)
            assertEquals(1, requests.size)
            assertEquals("imdb_id", requests.single().url.queryParameter("external_source"))
            assertEquals("fixture-key", requests.single().url.queryParameter("api_key"))
            assertEquals(request.copy(id = "tmdb:46298"), SeriesIdentity.resolve(request.copy(id = "tmdb:46298"), configured(), bridge))
            assertEquals(1, requests.size, "TMDB input must not add an identity request")
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun bearerKeyIsNormalizedForIdentityAndSubsequentEngineCalls() = runBlocking<Unit> {
        var authorization: String? = null
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            authorization = chain.request().header("Authorization")
            assertNull(chain.request().url.queryParameter("api_key"))
            response(chain.request(), """{"tv_results":[{"id":46298}]}""")
        }.build()
        val bridge = HttpBridge(client = client)
        try {
            val config = configured("Bearer fixture.jwt.token")
            assertEquals("fixture.jwt.token", config.tmdbKey)
            SeriesIdentity.resolve(EpisodeRequest("tt2098220", "tv"), config, bridge)
            assertEquals("Bearer fixture.jwt.token", authorization)
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
    }
    @Test fun missingKeyAndUnverifiedOrAmbiguousSeriesFailClosed() = runBlocking<Unit> {
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            response(chain.request(), """{"tv_results":[]} """)
        }.build()
        val bridge = HttpBridge(client = client)
        try {
            val request = EpisodeRequest("tt2098220", "tv")
            val missing = assertFailsWith<IdentityFailure> { SeriesIdentity.resolve(request, configured(""), bridge) }
            assertEquals("INPUT_METADATA_TMDB_KEY_REQUIRED", missing.code)
            assertEquals(request, SeriesIdentity.resolve(request, HostConfig(JSONObject().put("episodeMetadataSource", "native")), bridge))
        } finally { bridge.close(); client.dispatcher.executorService.shutdownNow() }
        for ((body, status, code) in listOf(
            Triple("""{"tv_results":[]}""", 200, "INPUT_METADATA_SERIES_ID_UNAVAILABLE"),
            Triple("""{"movie_results":[{"id":46298}]}""", 200, "INPUT_METADATA_SERIES_ID_UNAVAILABLE"),
            Triple("""{"tv_results":[{"id":1},{"id":2}]}""", 200, "INPUT_METADATA_SERIES_ID_AMBIGUOUS"),
            Triple("{}", 401, "INPUT_METADATA_TMDB_AUTH_FAILED"))) {
            val c = OkHttpClient.Builder().addInterceptor { chain -> response(chain.request(), body, status) }.build()
            val b = HttpBridge(client = c)
            try { assertEquals(code, assertFailsWith<IdentityFailure> { SeriesIdentity.resolve(EpisodeRequest("tt2098220", "tv"), configured(), b) }.code) }
            finally { b.close(); c.dispatcher.executorService.shutdownNow() }
        }
    }
    @Test fun fullEngineReproducesOldImdbFailureAndResolvesXperienceWithoutTmdbStamp() = runBlocking<Unit> {
        val routes = CopyOnWriteArrayList<String>()
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val request = chain.request(); val url = request.url
            routes.add(url.host + url.encodedPath)
            val body = when {
                url.host == "api.themoviedb.org" && url.encodedPath == "/3/find/tt11111111" -> """{"tv_results":[{"id":95479}]}"""
                url.host == "api.themoviedb.org" && url.encodedPath == "/3/find/1110" -> """{"tv_episode_results":[{"id":888,"show_id":95479,"season_number":1,"episode_number":1}]}"""
                url.host == "catalog.nuvio.tv" -> """{"meta":{"id":"tt11111111","name":"Example","genres":["Animation"],"released":"2000-01-01","videos":[{"id":"tt11111111:1:1","season":1,"episode":1,"title":"The Departure","released":"2000-01-01"}]}}"""
                url.host == "xp.example" -> """{"meta":{"id":"tt11111111","name":"Example","videos":[{"id":"tt11111111:1:1","season":1,"episode":1,"title":"Le Départ","released":"2000-01-01","thumbnail":"https://artworks.thetvdb.com/banners/series/123/episodes/1110.jpg"}]}}"""
                url.host == "anime.example" && url.encodedPath == "/catalogue/example/" -> """<h1>Example</h1><script>panneauAnime("Saison 1","saison1/vostfr/");</script>"""
                url.host == "anime.example" && url.encodedPath.endsWith("episodes.js") -> "var eps1=['https://ansembed.net/embed.html'];"
                url.host == "anime.example" -> """<script src="episodes.js"></script><script>resetListe();finirListe(1);</script>"""
                url.host == "ansembed.net" -> """<script>sources:[{file:'https://cdn.example/master.m3u8?sig=keep%2F&x=2'}];</script>"""
                url.host == "cdn.example" -> "#EXTM3U\n#EXT-X-STREAM-INF:RESOLUTION=1920x1080,BANDWIDTH=1000000\nvideo.m3u8"
                else -> error("Unexpected fixture route")
            }
            response(request, body, type = if(url.host in listOf("api.themoviedb.org", "catalog.nuvio.tv", "xp.example")) "application/json" else "text/html")
        }.build()
        val settings = configured().settings.put("animeSamaBaseUrl", "https://anime.example")
        val config = HostConfig(settings, "fixture-key")
        val bundle = java.io.File("../../../plugins/anime-sama/providers/anime-sama.js").readText()
        // Force the former bare-IMDb call at the JS boundary, after any host setup.
        val old = Engine(bundle + "\nvar originalStreams=getStreams;globalThis.getStreams=function(){return originalStreams('tt11111111','tv',1,1);};", HttpBridge(client = client))
        try {
            assertEquals(0, JSONObject(old.streams(EpisodeRequest("tt11111111", "tv"), config)).getJSONArray("streams").length())
            assertTrue(old.lastSummary.contains("INPUT_METADATA_EXTERNAL_ID_UNAVAILABLE"), old.lastSummary)
        } finally { old.close() }
        val fixed = Engine(bundle, HttpBridge(client = client))
        try {
            val streams = JSONObject(fixed.streams(EpisodeRequest("tt11111111", "tv"), config)).getJSONArray("streams")
            assertTrue(streams.length() > 0, fixed.lastSummary)
            assertTrue(routes.contains("catalog.nuvio.tv/meta/series/tmdb:95479.json"))
            assertTrue(routes.contains("xp.example/config/meta/series/tt11111111.json"))
            assertTrue(streams.getJSONObject(0).getString("url").contains("sig=keep%2F&x=2"))
        } finally { fixed.close(); client.dispatcher.executorService.shutdownNow() }
    }
}
