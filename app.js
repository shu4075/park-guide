// =====================================================
// app.js … このサイトの「動き」を担当するプログラム
// 大まかな流れ：
//   1. 地図を表示して、スポットを描く
//   2. 自分の位置を受け取る（デモ＝地図タップ / GPS＝本物の位置）
//   3. 各スポットまでの距離を計算する
//   4. 範囲に入ったスポットがあれば、カードを表示する
// =====================================================


// ---------- 設定 ----------
const PARK_CENTER = [35.6329, 139.8804]; // 最初に表示する地図の中心（仮）
const START_ZOOM = 17;                    // 最初の拡大率（大きいほど拡大）
const LEAVE_MARGIN = 10;                  // 範囲から「出た」と判定するための余裕（m）

const CATEGORY = {
  bgs:    { label: "裏設定",       color: "#6c5ce7" },
  hidden: { label: "隠れミッキー", color: "#e17055" },
  trivia: { label: "小ネタ",       color: "#00a884" }
};
const SOURCE = {
  official: "公式設定",
  theory:   "諸説あり"
};


// ---------- 1. 地図を表示 ----------
const map = L.map("map", { zoomControl: false }).setView(PARK_CENTER, START_ZOOM);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// スポットを地図に描く（反応する範囲の円＋中心の点）
SPOTS.forEach(function (spot) {
  const color = CATEGORY[spot.category].color;

  L.circle([spot.lat, spot.lng], {
    radius: spot.radius,
    color: color,
    weight: 1,
    fillOpacity: 0.12
  }).addTo(map);

  L.circleMarker([spot.lat, spot.lng], {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: color,
    fillOpacity: 1
  })
    .addTo(map)
    .on("click", function () { showCard(spot); }); // 点をタップしても読める
});


// ---------- 見つけた隠れミッキーの記録（ブラウザに保存） ----------
function loadFound() {
  try {
    return new Set(JSON.parse(localStorage.getItem("found") || "[]"));
  } catch (e) {
    return new Set(); // 保存できない環境でも動くように
  }
}
function saveFound() {
  try {
    localStorage.setItem("found", JSON.stringify(Array.from(found)));
  } catch (e) { /* 保存できなくても続行 */ }
}
const found = loadFound();

// 隠れミッキーの進捗（全部で何個あって、何個見つけたか）
// found には、あとでデータから消したスポットのIDが残っていることがあるので、
// 「今の SPOTS にある隠れミッキー」だけを数える
function hiddenProgress() {
  const hiddenSpots = SPOTS.filter(function (spot) { return spot.category === "hidden"; });
  const foundCount = hiddenSpots.filter(function (spot) { return found.has(spot.id); }).length;
  return { found: foundCount, total: hiddenSpots.length };
}

function progressText() {
  const p = hiddenProgress();
  return "隠れミッキー " + p.total + "個中 " + p.found + "個発見";
}


// ---------- 3. 距離の計算 ----------
// 緯度経度の2点間の距離（メートル）。地球を球として計算する「ハバーサイン公式」
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球の半径（m）
  const toRad = function (deg) { return deg * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}


// ---------- 2 & 4. 位置を受け取って、近くのスポットを判定 ----------
let meMarker = null;    // 自分の位置の青い点
let meAccuracy = null;  // GPSの誤差の円
let lastPos = null;     // 最後にわかった自分の位置（一覧を近い順に並べるのに使う）
const inside = new Set(); // 今、範囲の中にいるスポット（同じ通知を何度も出さないため）

function updatePosition(lat, lng, accuracy) {
  lastPos = { lat: lat, lng: lng };

  // 自分の位置を地図に描く
  if (!meMarker) {
    meAccuracy = L.circle([lat, lng], { radius: accuracy, color: "#2d8cff", weight: 1, fillOpacity: 0.1 }).addTo(map);
    meMarker = L.circleMarker([lat, lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2d8cff", fillOpacity: 1 }).addTo(map);
  } else {
    meMarker.setLatLng([lat, lng]);
    meAccuracy.setLatLng([lat, lng]).setRadius(accuracy);
  }

  let nearest = null;
  let nearestDist = Infinity;
  const entered = []; // 今回、新しく範囲に入ったスポット

  SPOTS.forEach(function (spot) {
    const d = distanceMeters(lat, lng, spot.lat, spot.lng);

    if (d < nearestDist) { nearest = spot; nearestDist = d; }

    if (d <= spot.radius && !inside.has(spot.id)) {
      inside.add(spot.id);
      entered.push({ spot: spot, d: d });
    } else if (d > spot.radius + LEAVE_MARGIN) {
      inside.delete(spot.id); // 十分離れたら、次に来たときまた通知する
    }
  });

  // 新しく入ったスポットのうち、一番近いものを表示
  if (entered.length > 0) {
    entered.sort(function (a, b) { return a.d - b.d; });
    showCard(entered[0].spot);
    if (navigator.vibrate) navigator.vibrate(200); // 対応端末なら振動（iPhoneは非対応）
  }

  if (nearest) {
    setStatus("いちばん近いスポット：" + nearest.name + "（約" + Math.round(nearestDist) + "m）");
  }

  if (listOpen) renderList(); // 一覧を開いていたら、並び順と距離を更新
}


// ---------- スポット一覧 ----------
const listEl = document.getElementById("list");
const btnList = document.getElementById("btn-list");
let listOpen = false;

// 距離を読みやすい形にする（例：85m、1.2km）
function formatDistance(m) {
  if (m < 1000) return "約" + Math.round(m) + "m";
  return "約" + (m / 1000).toFixed(1) + "km";
}

function renderList() {
  // 各スポットに「自分からの距離」をつける（位置がまだわからなければ null）
  const items = SPOTS.map(function (spot) {
    const d = lastPos ? distanceMeters(lastPos.lat, lastPos.lng, spot.lat, spot.lng) : null;
    return { spot: spot, d: d };
  });

  // 位置がわかっていれば近い順に並べる
  if (lastPos) {
    items.sort(function (a, b) { return a.d - b.d; });
  }

  // 進捗：文字と、バーの幅（見つけた割合を % にする）
  const p = hiddenProgress();
  document.getElementById("list-progress").textContent = progressText();
  document.getElementById("list-progress-fill").style.width =
    (p.total > 0 ? p.found / p.total * 100 : 0) + "%";

  document.getElementById("list-note").textContent = lastPos
    ? "近い順に並んでいます。タップすると読めます"
    : "現在地がわかると近い順に並びます（デモでは地図をタップ、またはGPSをオン）";

  const ul = document.getElementById("list-items");
  ul.innerHTML = ""; // いったん空にして作り直す

  items.forEach(function (item) {
    const cat = CATEGORY[item.spot.category];

    const btn = document.createElement("button");
    btn.className = "list-item";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = cat.label;
    badge.style.background = cat.color;

    const name = document.createElement("span");
    name.className = "list-name";
    name.textContent = item.spot.name;

    const dist = document.createElement("span");
    dist.className = "list-dist";
    dist.textContent = item.d === null ? "" : formatDistance(item.d);

    btn.append(badge, name);

    // 見つけた隠れミッキーには「発見済み」の印をつける
    if (item.spot.category === "hidden" && found.has(item.spot.id)) {
      const mark = document.createElement("span");
      mark.className = "list-found";
      mark.textContent = "発見済み";
      btn.append(mark);
    }

    btn.append(dist);
    btn.addEventListener("click", function () { showCard(item.spot); });

    const li = document.createElement("li");
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

btnList.addEventListener("click", function () {
  listOpen = !listOpen;
  listEl.classList.toggle("hidden", !listOpen);
  btnList.textContent = listOpen ? "地図" : "一覧";
  if (listOpen) renderList();
});


// ---------- カードの表示 ----------
const card = document.getElementById("card");
const foundBtn = document.getElementById("card-found");
let currentSpot = null;

function showCard(spot) {
  currentSpot = spot;
  const cat = CATEGORY[spot.category];

  const catEl = document.getElementById("card-category");
  catEl.textContent = cat.label;
  catEl.style.background = cat.color;

  const srcEl = document.getElementById("card-source");
  srcEl.textContent = SOURCE[spot.source];
  srcEl.classList.toggle("theory", spot.source === "theory");

  document.getElementById("card-title").textContent = spot.name;

  // 隠れミッキーで、まだ見つけていなければ「ヒント」だけ見せる
  const isHiddenUnfound = spot.category === "hidden" && !found.has(spot.id);
  document.getElementById("card-body").textContent = isHiddenUnfound ? spot.hint : spot.body;
  foundBtn.classList.toggle("hidden", !isHiddenUnfound);

  // 隠れミッキーのカードには、進捗も出す
  const progressEl = document.getElementById("card-progress");
  progressEl.textContent = progressText();
  progressEl.classList.toggle("hidden", spot.category !== "hidden");

  card.classList.remove("hidden");
}

foundBtn.addEventListener("click", function () {
  if (!currentSpot) return;
  found.add(currentSpot.id);
  saveFound();
  showCard(currentSpot); // 答えと、増えた進捗を表示し直す
  if (listOpen) renderList(); // 一覧の進捗と「発見済み」も更新
});

document.getElementById("card-close").addEventListener("click", function () {
  card.classList.add("hidden");
});

function setStatus(text) {
  document.getElementById("status").textContent = text;
}


// ---------- モード切り替え（デモ / GPS） ----------
let mode = "demo";
let watchId = null;

// デモモード：地図をタップした場所に「自分」が移動する（家で動作確認する用）
map.on("click", function (e) {
  if (mode === "demo") updatePosition(e.latlng.lat, e.latlng.lng, 5);
});

// GPSモード：スマホの本物の位置を使う
function startGps() {
  if (!("geolocation" in navigator)) {
    setStatus("この端末・ブラウザでは位置情報が使えません");
    return;
  }
  if (!window.isSecureContext) {
    setStatus("位置情報は https のページでしか使えません（公開後に試してください）");
    return;
  }
  setStatus("現在地を取得中…");
  watchId = navigator.geolocation.watchPosition(
    function (pos) {
      updatePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    },
    function (err) {
      const messages = {
        1: "位置情報の利用が許可されていません。ブラウザの設定を確認してください",
        2: "現在地を取得できませんでした",
        3: "現在地の取得に時間がかかっています"
      };
      setStatus(messages[err.code] || "位置情報のエラーです");
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function stopGps() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

const btnDemo = document.getElementById("btn-demo");
const btnGps = document.getElementById("btn-gps");

btnDemo.addEventListener("click", function () {
  mode = "demo";
  stopGps();
  btnDemo.classList.add("active");
  btnGps.classList.remove("active");
  setStatus("地図をタップすると、そこに「自分」が移動します");
});

btnGps.addEventListener("click", function () {
  mode = "gps";
  btnGps.classList.add("active");
  btnDemo.classList.remove("active");
  startGps();
});


// ---------- オフライン対応（Service Worker の登録） ----------
// sw.js を「門番」として登録する。対応していないブラウザでは何もしない
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function (e) {
    console.warn("Service Worker を登録できませんでした", e);
  });
}
