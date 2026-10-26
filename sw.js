// =====================================================
// sw.js … Service Worker（サービスワーカー）
// ページとインターネットの間に立つ「門番」のようなプログラム。
// ページがファイルを取りに行くたびに、ここを通る。
//   - 最初に開いたとき：アプリ本体のファイルを端末にしまっておく（キャッシュ）
//   - 次から：しまっておいたファイルをすぐ返す → 電波がなくても開ける
//   - 裏では最新版を取りに行き、取れたらしまい直す → 次に開いたとき新しくなる
// =====================================================


// ファイルを大きく変えたら、この番号を上げる（古いキャッシュが消える）
const CACHE_NAME = "park-guide-v1";

// オフラインでも使いたいファイルの一覧
const APP_FILES = [
  "./",
  "index.html",
  "style.css",
  "spots.js",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];


// ---------- インストール：アプリ本体をまとめてしまう ----------
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES);
    })
  );
  self.skipWaiting(); // 待たずに新しい版を使い始める
});


// ---------- 有効化：古い版のキャッシュを片付ける ----------
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim(); // 開いているページもすぐ門番の管理下に入れる
});


// ---------- ファイルの取得：しまってある物を先に返す ----------
self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  // 地図タイル（OpenStreetMap）は門番を通さず、そのままネットへ。
  // 利用規約に配慮して、タイルはこちらでキャッシュしない
  if (request.url.indexOf("tile.openstreetmap.org") !== -1) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (cached) {
        // 裏で最新版を取りに行き、取れたらしまい直す
        const fromNetwork = fetch(request)
          .then(function (response) {
            if (response.ok && isAppFile(request.url)) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(function () { return cached; }); // 電波がなければ、しまってある物で

        // しまってあればすぐ返す。なければネットの結果を待つ
        return cached || fromNetwork;
      });
    })
  );
});

// APP_FILES に入っているファイルかどうか
function isAppFile(url) {
  return APP_FILES.some(function (file) {
    return url === new URL(file, self.registration.scope).href;
  });
}
