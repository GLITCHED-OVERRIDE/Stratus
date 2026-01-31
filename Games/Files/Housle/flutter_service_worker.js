'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"favicon-16x16.png": "729f9584e0f8011138b4c0dbe043daa7",
"flutter_bootstrap.js": "9b79f979ffe9af5e7022c57d01ac1ba0",
"version.json": "e3fb9a075de5e0d54cd965f1d9ac7428",
"splash/style.css": "2f7575d1d5acbd9d58b621276a479986",
"index.html": "7119b25db1de444fea2194a42c65bea3",
"/": "7119b25db1de444fea2194a42c65bea3",
"main.dart.js": "196c777b7769f7b938eacaab448d7183",
"flutter.js": "24bc71911b75b5f8135c949e27a2984e",
"img/housle_logo.png": "d02fce149fa9defa3b9c3041c0f36f17",
"icons/android-chrome-192x192.png": "c144f83ba6804a870a5a434aad8743eb",
"icons/apple-touch-icon.png": "c7db00cb37c16fea23f7c371d9140935",
"icons/android-chrome-512x512.png": "50a0c4e370e3dca7c893cd8201803b12",
"manifest.json": "538ada36789967e31906e10a2a110922",
"housle/main.js": "51c3c09aa00a0d030ee0dac5508258c5",
"assets/NOTICES": "14cb8634a6639af501bc54dc633df82b",
"assets/FontManifest.json": "7b2a36307916a9721811788013e65289",
"assets/AssetManifest.bin.json": "08dfbda697678b5aa11d1744394eb211",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/shaders/stretch_effect.frag": "40d68efbbf360632f614c731219e95f0",
"assets/AssetManifest.bin": "f5c5a4dfaa52fcb0faca88809e61ef1e",
"assets/fonts/MaterialIcons-Regular.otf": "273acdc97aefeaed3b4fde23455c4cc0",
"assets/assets/images/2x/expand_icon.png": "6f4acdbabfb7d891f19c515986df00e4",
"assets/assets/images/2x/app_icon.png": "a909e48849c7e654c673e80052402a10",
"assets/assets/images/2x/dollar_sign.png": "12cbb8ce2bec4144ec31572a1365359c",
"assets/assets/images/2x/zoom_in.png": "ce8fa7add6be60267e3ecb34e93de425",
"assets/assets/images/2x/housle_border_logo.png": "fac0044f8a1127799887dae941d2b248",
"assets/assets/images/2x/housle_logo.png": "e6e4637b4f43e3171a07057c3e7e0735",
"assets/assets/images/2x/info_icon.png": "bde4165d384a6fa2c2f47e96b360cc14",
"assets/assets/images/2x/zoom_out.png": "2c3f5b3cdbb28edeb3b79046e1748a4c",
"assets/assets/images/2x/drawer_vector.png": "adce1965a816414718d11e546fbbbc79",
"assets/assets/images/2x/home_background_image_2x.png": "a3285fa10074be398ab18183c31293b3",
"assets/assets/images/2x/gallery_icon.png": "f9a34453c8261761be9bfea1073234de",
"assets/assets/game/games.json": "1b679cbb89c07e88729549af07537d73",
"assets/assets/game/images/20260211/4.png": "d5cde133c9d953033d4f2b263db40642",
"assets/assets/game/images/20260211/5.png": "c6e07b0faba6c8675e27a2ba0b0c8c94",
"assets/assets/game/images/20260211/2.png": "a4d10bece0613b20d7c02bd23722bd55",
"assets/assets/game/images/20260211/3.png": "97ac08e45a93d643ca3d6a6aae6c8da0",
"assets/assets/game/images/20260211/1.png": "a3794247f150ba0a4b7f55ab91c60892",
"assets/assets/game/images/20260211/0.png": "7945584052a14e8b8854bde43c082e3d",
"assets/assets/game/images/20260210/4.png": "2c16036a748600714111c892a535ad5e",
"assets/assets/game/images/20260210/5.png": "fe1c450488aafbe4c6436ba91fe8e426",
"assets/assets/game/images/20260210/2.png": "41138c035777ff915318c59b2eec6557",
"assets/assets/game/images/20260210/3.png": "33f00db528108ca88dec3338d891e591",
"assets/assets/game/images/20260210/1.png": "e3533d83e4ca70e923ef7aece6429114",
"assets/assets/game/images/20260210/0.png": "9c8524fac5c3f8b139d3fb1336e22baa",
"assets/assets/game/images/20260204/4.png": "6d0c96caaaba95598740506ebdac1afe",
"assets/assets/game/images/20260204/5.png": "13c6f9502abc89b239e0ae8aa95503cc",
"assets/assets/game/images/20260204/2.png": "e5903c95f3b69d8ff1104a56504aa94a",
"assets/assets/game/images/20260204/3.png": "6acc003d74a158fd847b74ac87956f91",
"assets/assets/game/images/20260204/1.png": "6022f102bd9f0e0db00cf3e91e5c4bc1",
"assets/assets/game/images/20260204/0.png": "7d04b01368a901a9ac94f662329df2b8",
"assets/assets/game/images/20260203/4.png": "f147ca87320e849892483290c5940935",
"assets/assets/game/images/20260203/5.png": "a8c5e2e0b5a1d4356305a017146fb31f",
"assets/assets/game/images/20260203/2.png": "8c550080dfdae2c4fa1a3759e6124c90",
"assets/assets/game/images/20260203/3.png": "35cc36b65465ed73e8941c6f9c1cbc1d",
"assets/assets/game/images/20260203/1.png": "5ac87602c13a736a8f68441e4335dc46",
"assets/assets/game/images/20260203/0.png": "16bed8d0aca4449071d56154fdbdb4c8",
"assets/assets/game/images/20260202/4.png": "a92a69bb870f1721af56f04b746b875e",
"assets/assets/game/images/20260202/5.png": "eec46c4325d9fe14b2373cb27ae23773",
"assets/assets/game/images/20260202/2.png": "e37e410f009216775022072525ea316b",
"assets/assets/game/images/20260202/3.png": "2d80a8dd81c10eb4223128a6cf9574d5",
"assets/assets/game/images/20260202/1.png": "860e21cc932f1674ac8c1c2120492a0e",
"assets/assets/game/images/20260202/0.png": "6a2c4a1b49a7b8b8546361195a3c2c92",
"assets/assets/game/images/20260205/4.png": "25151d599146637edddfabb00cf634f1",
"assets/assets/game/images/20260205/5.png": "c102f232844c339fce2bf1f036455181",
"assets/assets/game/images/20260205/2.png": "92aee7db955a7273b6b1ed4682ffcb1a",
"assets/assets/game/images/20260205/3.png": "5202c3afbb74163b1a47e4283e14cfe2",
"assets/assets/game/images/20260205/1.png": "8fb70a3074171915a0f795bb0e4f9863",
"assets/assets/game/images/20260205/0.png": "b44bcf5dc5ab02e2b4916af66c1dac6a",
"assets/assets/game/images/20260129/4.png": "7446418dad61c7f0f810747821de17a7",
"assets/assets/game/images/20260129/5.png": "4d2d5e11ddb98d8c0013c2e4e39ba170",
"assets/assets/game/images/20260129/2.png": "93973c0ac71b2e1b9cfa9560124f0dda",
"assets/assets/game/images/20260129/3.png": "583970f9a618002391e501807e1a9942",
"assets/assets/game/images/20260129/1.png": "132053cb077089ef6e63629646314be2",
"assets/assets/game/images/20260129/0.png": "7e8b27fa4dadc717eff17012e6bdc415",
"assets/assets/game/images/20260127/4.png": "4e7595b533487e197e18959986f0b9ec",
"assets/assets/game/images/20260127/5.png": "9be32580fd10ac0cbf882d71fb9aafb9",
"assets/assets/game/images/20260127/2.png": "d5d4ede7d9eb40aa58b50e90dfb6ecd4",
"assets/assets/game/images/20260127/3.png": "c32127a23a38e7c650ad37c4b381cb8d",
"assets/assets/game/images/20260127/1.png": "b670ea02f530f252cf013ddec7854b5c",
"assets/assets/game/images/20260127/0.png": "5ef49e793282f8e4f07ceaf0b63be288",
"assets/assets/game/images/20260128/4.png": "e996fdda17f037ea91f165df0ab593bf",
"assets/assets/game/images/20260128/5.png": "f87f1d0cc68a02bca6f93db54656ec61",
"assets/assets/game/images/20260128/2.png": "2ab9304741a04ec7c08de0c11e1c1ccc",
"assets/assets/game/images/20260128/3.png": "2e270fc71dd470d4a318a488fa930ada",
"assets/assets/game/images/20260128/1.png": "5ae51ead06f2913da128626f42592d6d",
"assets/assets/game/images/20260128/0.png": "40b34a96d5306d7bf73a76d082c4a7c7",
"assets/assets/game/images/20260131/4.png": "e37a4c993d61ad5202e1edb1dbdd880e",
"assets/assets/game/images/20260131/5.png": "b1ce9e16ddee694277d0c9244c55b274",
"assets/assets/game/images/20260131/2.png": "3a8358f47ce18900583026020f20e267",
"assets/assets/game/images/20260131/3.png": "c9876da94b0008abd9ec1c4ed20ea6f0",
"assets/assets/game/images/20260131/1.png": "00534b1d549b12d0cabfadaf071d9359",
"assets/assets/game/images/20260131/0.png": "c59f9cb721b584fc75184b10c51692b9",
"assets/assets/game/images/20260130/4.png": "e4136ecbfc73d96486a94ba86b6038b1",
"assets/assets/game/images/20260130/5.png": "af26ff6ca570041ee736e27337af65c6",
"assets/assets/game/images/20260130/2.png": "df9744444a6cf2ffe44c01aaacc26592",
"assets/assets/game/images/20260130/3.png": "ec019006b1b9fe5a84cb4447aa290ad4",
"assets/assets/game/images/20260130/1.png": "00265572770a59454ad80a09e458364f",
"assets/assets/game/images/20260130/0.png": "a5438a7d2246e24a740ee902565f94e1",
"assets/assets/game/images/20260212/4.png": "526b4e1444c28122f63fed5ed257c229",
"assets/assets/game/images/20260212/5.png": "1117ec4af5fce01895b4c021f1ae4558",
"assets/assets/game/images/20260212/2.png": "6b8c02f3c9af07ee7df99c0e91897cc9",
"assets/assets/game/images/20260212/3.png": "f2fb68148712ade0940ea239498ce343",
"assets/assets/game/images/20260212/1.png": "cb46f1fadef1b108eedac2c09b65f93a",
"assets/assets/game/images/20260212/0.png": "690ee105c46ae88f7154a9718e9a7f89",
"assets/assets/game/images/20260213/4.png": "4687736054e1babf23fb9c78a8e54a1f",
"assets/assets/game/images/20260213/5.png": "6040fa9525d24896813f05ec3717de4e",
"assets/assets/game/images/20260213/2.png": "349d684b943b4485e168590e76fe8a62",
"assets/assets/game/images/20260213/3.png": "09573242aec8d470ce7bf1a5e74dadcd",
"assets/assets/game/images/20260213/1.png": "29705a9e059c6e6203786bb2ac2d2007",
"assets/assets/game/images/20260213/0.png": "633e9759cf56bb4d03e976f938e3614f",
"assets/assets/game/images/20260209/4.png": "97874806fd632939c738a8974367308a",
"assets/assets/game/images/20260209/5.png": "a008f237cacce66b68f2d575ff319ba3",
"assets/assets/game/images/20260209/2.png": "e4dcf6341b8dba796b66a1c27a8901b2",
"assets/assets/game/images/20260209/3.png": "cef29bde0ca12ce89b86db13df9c21c3",
"assets/assets/game/images/20260209/1.png": "fdfff637cde317157a6c16f1a5513328",
"assets/assets/game/images/20260209/0.png": "724531533063c474bf2017bc3d3183b1",
"assets/assets/game/images/20260207/4.png": "b2396e8c20a5dd7cfb34c170c528cb37",
"assets/assets/game/images/20260207/5.png": "a0b80f3a04dced430e11ce0090e39147",
"assets/assets/game/images/20260207/2.png": "19835478ae7d578c247e2fc84495f2ef",
"assets/assets/game/images/20260207/3.png": "b09d5965b4c89e14abb486c009ff1942",
"assets/assets/game/images/20260207/1.png": "dd828d958cb6fb7fdb1d0ca701c3d6d6",
"assets/assets/game/images/20260207/0.png": "daa77cfec9c583ca6ebfec2ccb0e7da3",
"assets/assets/game/images/20260206/4.png": "940aba173f15d01ed42b5b985991e5a9",
"assets/assets/game/images/20260206/5.png": "e5993d323ab4db10c99907b84487fd68",
"assets/assets/game/images/20260206/2.png": "b26179f0b168c25b974c635b628eb23c",
"assets/assets/game/images/20260206/3.png": "7c4ec34d6abfc01d19c6f134d8620bd4",
"assets/assets/game/images/20260206/1.png": "f1c90779212d400640871e8bfecbb261",
"assets/assets/game/images/20260206/0.png": "7f036fca469ffcd566b091027298706d",
"assets/assets/game/images/20260201/4.png": "f99e447e3f11f82a7af426e483a5591e",
"assets/assets/game/images/20260201/5.png": "8e4d9a69fe147d07b3ded91810acd943",
"assets/assets/game/images/20260201/2.png": "39c05817488be7a86ade3e9f0d926da0",
"assets/assets/game/images/20260201/3.png": "6c147d82fe286625d0031aec105dc7e1",
"assets/assets/game/images/20260201/1.png": "850047acfd3447074a43bbec72d06269",
"assets/assets/game/images/20260201/0.png": "47b01ccfdb1d7baaac9c2ea3c12b6f8d",
"assets/assets/game/images/20260208/4.png": "f91af741973c718bedd8d28ca28838c9",
"assets/assets/game/images/20260208/5.png": "64994434efcdf18938f7b75779012625",
"assets/assets/game/images/20260208/2.png": "1e168b4af9b40e46065ec198d11b72c7",
"assets/assets/game/images/20260208/3.png": "c0c7363b46824da3166bc726aeaebc06",
"assets/assets/game/images/20260208/1.png": "b0905f2a29029f133466abc7a7b3f245",
"assets/assets/game/images/20260208/0.png": "bfcf190ae1215e71f67cac2edf74393d",
"assets/assets/google_fonts/Montserrat-LightItalic.ttf": "ce37c59e8bd8f6eecd40cf72e3198b56",
"assets/assets/google_fonts/Montserrat-Medium.ttf": "ee130b491bf120cdb261d27ec29e2805",
"assets/assets/google_fonts/PlayfairDisplay-Bold.ttf": "7150373c62655e32d1720fd3b3890d09",
"assets/assets/google_fonts/PlayfairDisplay-SemiBold.ttf": "f0713720c230460d5430d96d46f5cd28",
"assets/assets/google_fonts/Montserrat-BoldItalic.ttf": "8d0891d878255f74eafd82d059cdb9d1",
"assets/assets/google_fonts/PlayfairDisplay-Medium.ttf": "5a11632ed293fcfcc40970c2b22c858f",
"assets/assets/google_fonts/Montserrat-Light.ttf": "e1d9d4d7fc9ff0f24b901292a900ef66",
"assets/assets/google_fonts/Montserrat-ThinItalic.ttf": "da63f6debbd658592bcc843867837581",
"assets/assets/google_fonts/Montserrat-ExtraLight.ttf": "432be4a65a340e38f31651576ec58487",
"assets/assets/google_fonts/Montserrat-Thin.ttf": "a6cfec0cb3e946398cffcd4fa7ac61d1",
"assets/assets/google_fonts/Montserrat-Bold.ttf": "354dc625a35bef1b6ec00a79c6cfc0c8",
"assets/assets/google_fonts/Montserrat-MediumItalic.ttf": "aaba9a9046de09a1ace6971fd7dd3b8a",
"assets/assets/google_fonts/Montserrat-BlackItalic.ttf": "da2cf9d185834f683099611f0a8dd54b",
"assets/assets/google_fonts/PlayfairDisplay-BoldItalic.ttf": "4f75ab298ac2ea9f107452bcbd2b58ff",
"assets/assets/google_fonts/PlayfairDisplay-ExtraBoldItalic.ttf": "f4e823b725b3d4fb5dcee448f9225462",
"assets/assets/google_fonts/PlayfairDisplay-Italic.ttf": "2d6979d4e6a9fa458c3037e6d8f9abb6",
"assets/assets/google_fonts/PlayfairDisplay-Regular.ttf": "9116faa12b7016e93277294c7a0735b6",
"assets/assets/google_fonts/Montserrat-SemiBold.ttf": "6e7bd3eacb1d1088e5063e375fc467aa",
"assets/assets/google_fonts/Montserrat-ExtraLightItalic.ttf": "5f562375fc1e3717fb1f8f788e86291a",
"assets/assets/google_fonts/Montserrat-ExtraBold.ttf": "1497e6fee4dd060b35f6b49e4241cb3f",
"assets/assets/google_fonts/Montserrat-Black.ttf": "b9ca03e9742434a8a843b6402995f1c8",
"assets/assets/google_fonts/Montserrat-Regular.ttf": "38712903602f88435ddddec98862f8b8",
"assets/assets/google_fonts/Montserrat-Italic.ttf": "5128267cb132ae4a1a9e1d8ed61c1834",
"assets/assets/google_fonts/PlayfairDisplay-Black.ttf": "90bd8fc6f4db46013bb128526ae4014f",
"assets/assets/google_fonts/PlayfairDisplay-SemiBoldItalic.ttf": "7ccf7428080713963ca79b5a3ecfe7ea",
"assets/assets/google_fonts/PlayfairDisplay-MediumItalic.ttf": "5a7593cfe47e44dc3b1ec10da24d8da3",
"assets/assets/google_fonts/PlayfairDisplay-BlackItalic.ttf": "da2c33c6381f3e560d337ed9049a0e81",
"assets/assets/google_fonts/PlayfairDisplay-ExtraBold.ttf": "c474656eff24a077b81bb584c5960b04",
"assets/assets/google_fonts/Montserrat-SemiBoldItalic.ttf": "9d08190268d026bbe4046c3cf911f87b",
"assets/assets/google_fonts/Montserrat-ExtraBoldItalic.ttf": "f201991f01e3d93a72a397ad8634f279",
"favicon-32x32.png": "c68a74204eae3a7e31fc69d2614b4745",
"canvaskit/skwasm.js": "8060d46e9a4901ca9991edd3a26be4f0",
"canvaskit/skwasm_heavy.js": "740d43a6b8240ef9e23eed8c48840da4",
"canvaskit/skwasm.js.symbols": "3a4aadf4e8141f284bd524976b1d6bdc",
"canvaskit/canvaskit.js.symbols": "a3c9f77715b642d0437d9c275caba91e",
"canvaskit/skwasm_heavy.js.symbols": "0755b4fb399918388d71b59ad390b055",
"canvaskit/skwasm.wasm": "7e5f3afdd3b0747a1fd4517cea239898",
"canvaskit/chromium/canvaskit.js.symbols": "e2d09f0e434bc118bf67dae526737d07",
"canvaskit/chromium/canvaskit.js": "a80c765aaa8af8645c9fb1aae53f9abf",
"canvaskit/chromium/canvaskit.wasm": "a726e3f75a84fcdf495a15817c63a35d",
"canvaskit/canvaskit.js": "8331fe38e66b3a898c4f37648aaf7ee2",
"canvaskit/canvaskit.wasm": "9b6a7830bf26959b200594729d73538e",
"canvaskit/skwasm_heavy.wasm": "b0be7910760d205ea4e011458df6ee01"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}