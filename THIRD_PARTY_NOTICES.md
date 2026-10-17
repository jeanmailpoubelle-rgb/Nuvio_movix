# Third-party notices

The combined project is distributed under **GPL-3.0-only**, selecting GPL version
3 for earlier GPL-3.0-or-later components and retaining the ported components'
GPL-3.0-only terms. See [LICENSE](LICENSE).

- [Nuvio_frembed](https://github.com/jeanmailpoubelle-rgb/Nuvio_frembed), reviewed
  at `ace5453`: Frembed discovery/granted-player protocols, VOE F7, Dood, Vidmoly,
  StreamWish, MixDrop, JWPlayer and base62 P.A.C.K.E.R. parsing were adapted into
  this project's request handling, shared result format and timer-free runtime.
  The original repository remains separate and unmodified.
- [CloudStream](https://github.com/recloudstream/cloudstream), GPL-3.0, reference
  commit `d9c55e2e5b020dde8e28c12a3e7802df962265ac`, supplies the underlying host
  protocols and JsUnpacker behavior referenced by Nuvio_frembed. JsUnpacker also
  credits [cylonu87/JsUnpacker](https://github.com/cylonu87/JsUnpacker). Original
  authors and contributors retain their rights.
- Frembed v7 in `jeanmailpoubelle-rgb/cloudstream-source`, reference commit
  `4c4d7295c01fbb7e9b6cf2f7048d61cd18b5593e`, is the provider protocol reference
  documented by Nuvio_frembed. Its private fixtures were not copied.
- [All-in-One-Nuvio](https://github.com/D3adlyRocket/All-in-One-Nuvio), including
  wooodyhood's providers, remains a reference for the original provider families.
- [Nuvio_anime_sama](https://github.com/jeanmailpoubelle-rgb/Nuvio_anime_sama),
  `f8605f146b1fb3118f04b36149239f0aa4de3e53` (1.0.6), GPL-3.0-or-later:
  native catalogue/ID matching, episode mapping, literal script parsing, reduced
  HTML/episode fixtures, binary bridge handling and MP4 duration validation were
  ported for the dedicated Anime-Sama plugin. GPL version 3 is selected here.
  Its original CloudStream/Nuvio references and author attribution remain in
  [the upstream references](https://github.com/jeanmailpoubelle-rgb/Nuvio_anime_sama/blob/f8605f146b1fb3118f04b36149239f0aa4de3e53/docs/REFERENCES.md).
  Host extraction is consolidated into this repository's shared resolvers. The
  original repository and optional companion addon remain separate and unmodified.
- [MovixOpenSource](https://github.com/movixstream/MovixOpenSource), reviewed at
  `f4542cee8a6870d44e741db83f83255d85308217`, documents Movix's public API routes.
  That repository uses CC BY-NC 4.0. This GPL project implements independent
  public-protocol clients; no Movix implementation code or assets were copied.
- [aes-js 3.1.2](https://www.npmjs.com/package/aes-js/v/3.1.2), by Richard Moore,
  is vendored unmodified under MIT in `vendor/aes-js` for portable SeekStreaming
  AES-CBC decoding. Its complete MIT notice is included in every active bundle;
  see [the original license](vendor/aes-js/LICENSE.txt). No WebCrypto or runtime
  package download is required.
- [NuvioTV](https://github.com/NuvioMedia/NuvioTV) tag 1.0.0, commit
  `9f17e8bf4abc799dc8c832d2894a8b3b166e4353`, and
  [NuvioMobile](https://github.com/NuvioMedia/NuvioMobile) commit
  `808272dcec4be02397282600b70a07111576e0c7`: literal JavaScript runtime test
  fixtures retain their upstream GPL attribution. They are development fixtures,
  not shipped inside provider bundles.

No browser/WebView implementation, advertising code, challenge solver, account
credentials, signed live media URLs or complete subtitle files are included.

The Yablom/Xatobam/Pirvab catalogue adapter and ShareCloudy integration were
implemented from observed public HTML/form/player protocols. No website
implementation code, styles, assets or advertising scripts were copied.
