# aes-js 3.1.2

Unmodified `index.js` and `LICENSE.txt` from the published
[aes-js 3.1.2 package](https://registry.npmjs.org/aes-js/-/aes-js-3.1.2.tgz).
Copyright Richard Moore; MIT licensed.

The local build wraps its CommonJS export for Nuvio's JavaScript runtime and
includes the full license in each active provider. No Node dependency, WebCrypto,
network download or downloaded player JavaScript is needed at runtime.

SeekStreaming framing is implemented independently in `src/seek.js`. Regression
fixtures are encrypted with Node's independent AES-128-CBC implementation and
decrypted through the generated providers in Node and the TV/mobile JS runtimes.
