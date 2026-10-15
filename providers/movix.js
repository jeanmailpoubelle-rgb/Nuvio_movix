/*
 * Movix VF TV 1.1.0
 * Copyright (C) 2026 Nuvio_movix contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Protocol reference: wooodyhood's Movix provider distributed by
 * D3adlyRocket/All-in-One-Nuvio. This implementation is written independently.
 */
(function () {
    'use strict';

    var VERSION = '1.1.0';
    var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    var DEFAULT_API = 'https://api.movix.cash';
    var DEFAULT_SITE = 'https://movix.cash/';

    function log(message) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn('[MovixTV ' + VERSION + '] ' + message);
        }
    }

    function errorMessage(error) {
        return error && error.message ? error.message : String(error);
    }

    // No Node, DOM, browser cookies, timers, or hard-coded TMDB key required.
    function config() {
        var settings = typeof SCRAPER_SETTINGS === 'object' && SCRAPER_SETTINGS || {};
        var api = String(settings.apiBase || DEFAULT_API).replace(/\/+$/, '');
        var site = String(settings.siteBase || DEFAULT_SITE).replace(/\/+$/, '') + '/';
        if (!/^https:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/.test(api) ||
            !/^https:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/.test(site)) {
            throw new Error('apiBase and siteBase must be HTTPS URLs');
        }
        return { api: api, site: site };
    }

    function requestText(url, referer, stage) {
        return fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Referer': referer } })
            .then(function (response) {
                if (!response || response.ok === false || response.status === 0 || response.status >= 400) {
                    throw new Error(stage + ': HTTP ' + (response ? response.status : 'no response'));
                }
                return response.text();
            });
    }

    function requestJson(url, referer, stage) {
        return requestText(url, referer, stage).then(function (text) {
            var data;
            try { data = JSON.parse(text); }
            catch (_) { throw new Error(stage + ': response is not JSON'); }
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error(stage + ': invalid JSON object');
            }
            return data;
        });
    }

    function mediaUrl(value, base) {
        if (typeof value !== 'string') return null;
        var url = value.trim().replace(/&amp;/g, '&').replace(/\\\//g, '/');
        if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^https?:\/\//i.test(url)) return null;
        if (url.indexOf('//') === 0) url = 'https:' + url;
        if (url.charAt(0) === '/') {
            var origin = base.match(/^https?:\/\/[^/]+/i);
            if (origin) url = origin[0] + url;
        } else if (!/^https?:\/\//i.test(url) && url && base) {
            url = base.replace(/[^/]*$/, '') + url;
        }
        return /^https?:\/\/[^\s/]+\/[^\s]*$/i.test(url) ? url : null;
    }

    function formatOf(url, declared) {
        var match = url.match(/\.(m3u8|mp4)(?:[?#]|$)/i);
        if (match) return match[1].toLowerCase();
        // Purstream may return extensionless media URLs with an explicit format.
        if (/\.(?:html?|php)(?:[?#]|$)/i.test(url)) return null;
        return /^(?:m3u8|mp4)$/i.test(declared || '') ? declared.toLowerCase() : null;
    }

    function stream(source, referer, base, hint) {
        if (!source || typeof source !== 'object') return null;
        var url = mediaUrl(source.url, base);
        if (!url) return null;
        var format = formatOf(url, source.format);
        if (!format) return null;
        var label = String(source.name || source.server || 'Movix');
        var info = label + ' ' + (source.lang || hint || '');
        var qualityMatch = info.match(/\b(\d{3,4})p\b/i);
        var quality = qualityMatch ? qualityMatch[1] + 'p' : /\b(?:4k|uhd)\b/i.test(info) ? '2160p' : 'HD';
        var language = /\b(?:MULTI|DUAL(?:-AUDIO)?)\b/i.test(info) ? 'MULTI' :
            /VOST/i.test(info) ? 'VOSTFR' : /\bVF(?:F|Q)?\b/i.test(info) ? 'VF' : '';
        var headers = { 'User-Agent': USER_AGENT, 'Referer': referer };
        if (source.headers && typeof source.headers === 'object') {
            Object.keys(source.headers).forEach(function (key) {
                if (typeof source.headers[key] === 'string') {
                    // Treat header names case-insensitively when overriding defaults.
                    Object.keys(headers).forEach(function (existing) {
                        if (existing.toLowerCase() === key.toLowerCase()) delete headers[existing];
                    });
                    headers[key] = source.headers[key];
                }
            });
        }
        var name = 'Movix VF TV | ' + quality + (language ? ' | ' + language : '');
        return {
            name: name, title: label, description: label, url: url,
            quality: quality, language: language, format: format, headers: headers
        };
    }

    function unique(streams) {
        var seen = {};
        return streams.filter(function (item) {
            if (!item) return false;
            // Keep the same URL with different playback headers as distinct choices.
            var key = JSON.stringify([item.url, item.headers]);
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    }

    function primary(endpoint, id, type, season, episode) {
        var path = '/api/purstream/' + type + '/' + id + '/stream';
        if (type === 'tv') path += '?season=' + season + '&episode=' + episode;
        return requestJson(endpoint.api + path, endpoint.site, 'Purstream').then(function (data) {
            if (!Array.isArray(data.sources)) throw new Error('Purstream: missing sources array');
            // Return media URLs directly. Reading the playlist here costs a network
            // round trip, can encounter anti-bot pages, and is not a playback check.
            var result = unique(data.sources.map(function (source) {
                return stream(source, endpoint.site, endpoint.site);
            }));
            if (!result.length) log('Purstream: no direct media sources; trying backup');
            return result;
        });
    }

    function resolveLink(link, endpoint) {
        var url = mediaUrl(link.url, endpoint.site);
        if (!url) return Promise.resolve(null);
        var direct = stream(link, endpoint.site, endpoint.site, link.lang);
        if (direct) return Promise.resolve(direct);
        return requestText(url, endpoint.site, 'Embed').then(function (html) {
            // Static embeds only. Do not execute third-party page scripts.
            var normalized = html.replace(/\\\//g, '/');
            var match = normalized.match(/["']([^"'<>\s]+\.(?:m3u8|mp4)(?:\?[^"'<>\s]*)?)["']/i);
            if (!match) {
                log('Embed: no static media URL (player ' + String(link.server || 'unknown') + ')');
                return null;
            }
            return stream({ url: match[1], name: link.server || 'Backup', lang: link.lang }, url, url);
        }).catch(function (error) { log(errorMessage(error)); return null; });
    }

    function backup(endpoint, id, type, season, episode) {
        var path = '/api/cpasmal/' + type + '/' + id;
        if (type === 'tv') path += '/' + season + '/' + episode;
        return requestJson(endpoint.api + path, endpoint.site, 'Cpasmal').then(function (data) {
            var links = [];
            ['vf', 'vostfr'].forEach(function (lang) {
                if (data.links && Array.isArray(data.links[lang])) {
                    data.links[lang].forEach(function (item) {
                        if (item && typeof item.url === 'string') {
                            links.push({ url: item.url, server: item.server, lang: lang, headers: item.headers });
                        }
                    });
                }
            });
            // Bound extra requests on the TV's synchronous native fetch bridge.
            return Promise.all(links.slice(0, 3).map(function (link) {
                return resolveLink(link, endpoint);
            })).then(unique);
        });
    }

    function getStreams(tmdbId, mediaType, season, episode) {
        return Promise.resolve().then(function () {
            var id = String(tmdbId);
            if (!/^\d+$/.test(id)) throw new Error('Expected a numeric TMDB ID');
            var type = String(mediaType || '').toLowerCase();
            if (/^(?:series|show|tv)$/.test(type)) type = 'tv';
            if (type !== 'movie' && type !== 'tv') throw new Error('Unsupported media type');
            if (type === 'tv') {
                if (season == null || episode == null || !/^\d+$/.test(String(season)) ||
                    !/^[1-9]\d*$/.test(String(episode))) {
                    throw new Error('Series requires season >= 0 and episode >= 1');
                }
                season = Number(season);
                episode = Number(episode);
            }
            var endpoint = config();
            log('TMDB ' + id + ' (' + type + '): starting');
            return primary(endpoint, id, type, season, episode)
                .catch(function (error) { log(errorMessage(error)); return []; })
                .then(function (result) {
                    return result.length ? result : backup(endpoint, id, type, season, episode);
                });
        }).then(function (result) {
            log('Result: ' + result.length + ' source(s)');
            if (!result.length) log('No supported media returned by either API');
            return result;
        }).catch(function (error) {
            log(errorMessage(error));
            return [];
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getStreams: getStreams };
    } else if (typeof globalThis !== 'undefined') {
        globalThis.getStreams = getStreams;
    } else if (typeof global !== 'undefined') {
        global.getStreams = getStreams;
    }
})();
