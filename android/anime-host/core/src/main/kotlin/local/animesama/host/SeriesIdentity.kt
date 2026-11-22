package local.animesama.host

import org.json.JSONObject
import java.net.URLEncoder

class IdentityFailure(val code: String) : IllegalStateException(code)

/** Standard addons receive catalogue IDs; native plugins receive TMDB IDs.
 * Resolve series identity only. Displayed episode coordinates stay untouched.
 */
object SeriesIdentity {
    suspend fun resolve(request: EpisodeRequest, config: HostConfig, bridge: HttpBridge): EpisodeRequest {
        if (!Regex("^tt[0-9]+$").matches(request.id)) return request
        val token = config.tmdbKey.trim().replace(Regex("^Bearer\\s+", RegexOption.IGNORE_CASE), "")
        if (token.isEmpty()) {
            if (request.type == "tv" && config.settings.optString("episodeMetadataSource", "aiometadata") != "native")
                throw IdentityFailure("INPUT_METADATA_TMDB_KEY_REQUIRED")
            return request
        }
        bridge.verifiedIdentity(request, token)?.let { return request.copy(id = it) }
        val headers = JSONObject()
        var url = "https://api.themoviedb.org/3/find/${request.id}?external_source=imdb_id"
        if (token.contains('.')) headers.put("Authorization", "Bearer $token")
        else url += "&api_key=" + URLEncoder.encode(token, "UTF-8")
        val reply = try { JSONObject(bridge.fetch(JSONObject().put("url", url).put("headers", headers).toString(), config)) }
        catch (e: kotlinx.coroutines.CancellationException) { throw e }
        catch (_: Exception) { throw IdentityFailure("INPUT_METADATA_SERIES_ID_UNAVAILABLE") }
        if (reply.optInt("status") in listOf(401, 403)) throw IdentityFailure("INPUT_METADATA_TMDB_AUTH_FAILED")
        if (!reply.optBoolean("ok")) throw IdentityFailure("INPUT_METADATA_SERIES_ID_UNAVAILABLE")
        val result = try { JSONObject(reply.getString("body")) } catch (_: Exception) { throw IdentityFailure("INPUT_METADATA_SERIES_ID_UNAVAILABLE") }
        val rows = result.optJSONArray(if (request.type == "tv") "tv_results" else "movie_results")
            ?: throw IdentityFailure("INPUT_METADATA_SERIES_ID_UNAVAILABLE")
        if (rows.length() > 1) throw IdentityFailure("INPUT_METADATA_SERIES_ID_AMBIGUOUS")
        val id = rows.optJSONObject(0)?.optString("id").orEmpty()
        if (!Regex("^[1-9][0-9]{0,9}$").matches(id)) throw IdentityFailure("INPUT_METADATA_SERIES_ID_UNAVAILABLE")
        bridge.rememberIdentity(request, token, id)
        return request.copy(id = id)
    }
}
