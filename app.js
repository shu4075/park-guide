// =====================================================
// app.js … このサイトの「動き」を担当するプログラム
// 大まかな流れ：
//   1. 地図を表示して、スポットを描く
//   2. 自分の位置を受け取る（デモ＝地図タップ / GPS＝本物の位置）
//   3. 各スポットまでの距離を計算する
//   4. 範囲に入ったスポットがあれば、カードを表示する
// =====================================================


// ---------- 設定 ----------
const PARK_CENTER = [35.6329, 139.8804]; // 最初に表示する地図の中心（ランド）
const SEA_CENTER = [35.6262, 139.8850];  // シーの中心（プロメテウス火山のあたり）

// 地図の向き（公式マップに合わせて、入口が下になるように回す）
//   数字は「画面の上に来る方角」（北=0、東=90、南=180、西=270）
//   ランド：メインエントランス → シンデレラ城 の方角が上
//   シー  ：エントランス → プロメテウス火山 の方角が上
// 向きが少し違うと思ったら、この数字を変える
const LAND_BEARING = 156;
const SEA_BEARING = 245;
const START_ZOOM = 17;                    // 最初の拡大率（大きいほど拡大）
const LEAVE_MARGIN = 10;                  // 範囲から「出た」と判定するための余裕（m）

// ネタ投稿フォーム（Googleフォーム）のURL。作ったらここに貼る。空のあいだは「準備中」と出る
const SUBMIT_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdr7NfbE_rhEpXQCxitHDnj_TjymBwOxM5hxLAieCPCsdjFmw/viewform";

// 色は style.css の --bgs / --hidden / --trivia と同じにしておく
const CATEGORY = {
  bgs:    { label: "BGS",          color: "#2f4a7a" },
  hidden: { label: "隠れミッキー", color: "#b5452f" },
  trivia: { label: "小ネタ",       color: "#5b7a3a" },
  food:   { label: "おすすめメニュー", color: "#9a6b1f" }
};
const SOURCE = {
  official: "公式情報",
  theory:   "諸説あり"
};


// ---------- 位置の直し（位置編集モードで直して、この端末に保存したもの） ----------
// spots.js の値を「元の値」として覚えてから、直した値で上書きする
const ORIGINAL = {}; // スポットID → spots.js に書いてある lat / lng / radius
SPOTS.forEach(function (spot) {
  ORIGINAL[spot.id] = { lat: spot.lat, lng: spot.lng, radius: spot.radius };
});

function loadEdits() {
  try {
    return JSON.parse(localStorage.getItem("spotEdits") || "{}");
  } catch (e) {
    return {};
  }
}
function saveEdits() {
  try {
    localStorage.setItem("spotEdits", JSON.stringify(spotEdits));
  } catch (e) { /* 保存できなくても続行 */ }
}
function sameValues(a, b) {
  return a && b && a.lat === b.lat && a.lng === b.lng && a.radius === b.radius;
}

const spotEdits = loadEdits();
SPOTS.forEach(function (spot) {
  const edit = spotEdits[spot.id];
  if (!edit) return;
  // 直したあとに spots.js のほうが書き換えられていたら（＝直しを書き写し済み）、端末の直しは捨てる
  if (!sameValues(edit.base, ORIGINAL[spot.id])) {
    delete spotEdits[spot.id];
    return;
  }
  spot.lat = edit.lat;
  spot.lng = edit.lng;
  spot.radius = edit.radius;
});
saveEdits();


// ---------- 1. 地図を表示 ----------
const map = L.map("map", {
  zoomControl: false,
  rotate: true,          // 地図の回転を使う（leaflet-rotate）
  touchRotate: false,    // 2本指でうっかり回ってしまわないようにする
  rotateControl: false   // 回転用のボタンは出さない（代わりに右上の N で方位を示す）
}).setView(PARK_CENTER, START_ZOOM);

// 地図を回して、右上の「N」を北の方向に向ける
function setMapBearing(bearing) {
  if (typeof map.setBearing !== "function") return; // 回転の部品が読み込めなかったときは回さない
  map.setBearing(-bearing); // leaflet-rotate は「地図を回す角度」なので、上に来る方角の逆向きに回す
  document.getElementById("compass").style.transform = "rotate(" + (-bearing) + "deg)";
}
setMapBearing(LAND_BEARING);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// スポットを地図に描く（反応する範囲の円＋中心の点）
// あとで位置編集モードで動かせるように、描いた円と点を spotLayers に覚えておく
const spotLayers = {}; // スポットID → { circle, dot }
SPOTS.forEach(function (spot) {
  const color = CATEGORY[spot.category].color;

  const circle = L.circle([spot.lat, spot.lng], {
    radius: spot.radius,
    color: color,
    weight: 1,
    fillOpacity: 0.12
  }).addTo(map);

  const dot = L.circleMarker([spot.lat, spot.lng], {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: color,
    fillOpacity: 1
  })
    .addTo(map)
    .on("click", function () { showCard(spot); }); // 点をタップしても読める

  spotLayers[spot.id] = { circle: circle, dot: dot };
});

// ランドとシーの切り替え：押したほうのパークに、地図の表示場所を移す
const btnLand = document.getElementById("park-land");
const btnSea = document.getElementById("park-sea");
let showingSea = false;
function showPark(sea) {
  showingSea = sea;
  map.setView(sea ? SEA_CENTER : PARK_CENTER, START_ZOOM);
  setMapBearing(sea ? SEA_BEARING : LAND_BEARING);
  btnLand.setAttribute("aria-pressed", sea ? "false" : "true");
  btnSea.setAttribute("aria-pressed", sea ? "true" : "false");
}
btnLand.addEventListener("click", function () { showPark(false); });
btnSea.addEventListener("click", function () { showPark(true); });


// ---------- 表示の切り替え（すべて／スポット／隠れミッキー） ----------
// 選んだ種類のスポットだけを、地図に出し、通知・カード・一覧の対象にする。
// 隠れミッキー探しに集中したいときに、BGSなどの通知が鳴らないようにするため
const FILTER_LABEL = {
  all: "すべて",
  spots: "スポット（BGS・小ネタ・メニュー）",
  hidden: "隠れミッキー"
};
let viewFilter = loadFilter();

function loadFilter() {
  try {
    const v = localStorage.getItem("viewFilter");
    return FILTER_LABEL[v] ? v : "all";
  } catch (e) {
    return "all";
  }
}
function saveFilter() {
  try {
    localStorage.setItem("viewFilter", viewFilter);
  } catch (e) { /* 保存できなくても続行 */ }
}

// このスポットを今の表示の対象にするか
function isShown(spot) {
  if (viewFilter === "hidden") return spot.category === "hidden";
  if (viewFilter === "spots") return spot.category !== "hidden";
  return true;
}

// 地図の円と点を、対象のものだけ表示する
function applyFilterToMap() {
  SPOTS.forEach(function (spot) {
    const layers = spotLayers[spot.id];
    [layers.circle, layers.dot].forEach(function (layer) {
      if (isShown(spot)) layer.addTo(map); else layer.remove();
    });
  });
  document.querySelectorAll("#filter button").forEach(function (b) {
    b.setAttribute("aria-pressed", b.dataset.filter === viewFilter ? "true" : "false");
  });
}

document.querySelectorAll("#filter button").forEach(function (b) {
  b.addEventListener("click", function () {
    viewFilter = b.dataset.filter;
    saveFilter();
    applyFilterToMap();

    // 一覧のタブも合わせる（「すべて」のときはタブはそのまま）
    if (viewFilter === "hidden") listTab = "hidden";
    if (viewFilter === "spots") listTab = "spots";
    if (debugOn) renderDebug();
    if (editOn) { stopEdit(); startEdit(); } // 位置編集の ◎ も、表示中のものだけにする

    closeCard(); // 一覧にもどす（一覧もここで作り直される）
    setStatus("表示：" + FILTER_LABEL[viewFilter] + "。通知もこの種類だけ届きます");
  });
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
  // accuracy … GPSの誤差（m）。「本当の位置は、この半径の円のどこか」という意味
  lastPos = { lat: lat, lng: lng, accuracy: accuracy, time: new Date() };
  updateCount++;

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

  // 表示の切り替えで選んでいる種類のスポットだけを判定する
  SPOTS.filter(isShown).forEach(function (spot) {
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
    if (mode === "gps") notifyNearby(entered[0].spot); // 端末の通知も出す（音で気づける）
  }

  if (nearest) {
    setStatus("いちばん近いスポット：" + nearest.name + "（約" + Math.round(nearestDist) + "m）");
  }

  renderList();               // 一覧の並び順と距離を更新
  if (debugOn) renderDebug(); // デバッグ表示も更新
  if (following) map.panTo([lat, lng]); // 現在地ボタンを押したあとは、地図が自分についてくる
}


// ---------- 下の引き出し（ボトムシート） ----------
// 地図アプリでよく使われる形。地図を見ながら、下から情報を引き出せる。
// 大きさは3段階：peek（少しだけ）→ half（半分）→ full（ほぼ全画面）
// 仕組み：引き出しの高さは固定で、style.css の transform で「下にずらす量」を変えている。
// つまみを指で動かしている間は、指に合わせて直接ずらし、離したら近い段階にぴたっと止める。
const sheet = document.getElementById("sheet");
const sheetBody = document.getElementById("sheet-body");
const sheetHandle = document.getElementById("sheet-handle");
const SHEET_STATES = ["peek", "half", "full"];

function setSheet(state) {
  sheet.dataset.state = state;
  sheet.style.transform = ""; // ドラッグ中に直接入れた値を消して、style.css の値にもどす
  sheetHandle.setAttribute("aria-label", state === "full" ? "引き出しを小さくする" : "引き出しを広げる");
}

// つまみと「いつも見えている部分」を上下にドラッグできるようにする
(function () {
  let startY = 0;
  let startOffset = 0;
  let moved = false;
  let dragging = false;

  function onDown(e) {
    if (e.target.closest("button") && e.target !== sheetHandle && !sheetHandle.contains(e.target)) return; // ボタンは普通に押せるようにする
    dragging = true;
    moved = false;
    startY = e.clientY;
    // 指が引き出しの外に出ても、離すまで追いかける
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    // 今の位置を、画面に出ている見た目から読み取る
    startOffset = new DOMMatrix(getComputedStyle(sheet).transform).m42;
  }
  function onMove(e) {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dy) < 6) return; // 少し動いただけならタップ扱い
    if (!moved) {
      moved = true;
      sheet.classList.add("dragging");
    }
    const maxOffset = sheet.offsetHeight - peekHeight();
    const y = Math.min(Math.max(startOffset + dy, 0), maxOffset);
    sheet.style.transform = "translateY(" + y + "px)";
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove("dragging");
    if (!moved) return;
    // 離した位置に一番近い段階を選ぶ。速くはじいたら、その向きに1段階進める
    const y = new DOMMatrix(getComputedStyle(sheet).transform).m42;
    const h = sheet.offsetHeight;
    const offsets = { full: 0, half: h * 0.45, peek: h - peekHeight() };
    const dy = e.clientY - startY;
    let best = "peek";
    SHEET_STATES.forEach(function (s) {
      if (Math.abs(offsets[s] - y) < Math.abs(offsets[best] - y)) best = s;
    });
    const before = sheet.dataset.state;
    if (best === before && Math.abs(dy) > 40) {
      const i = SHEET_STATES.indexOf(before) + (dy < 0 ? 1 : -1);
      best = SHEET_STATES[Math.min(Math.max(i, 0), 2)];
    }
    setSheet(best);
  }
  // つまみと上の部分だけでドラッグする（中身のスクロールとぶつからないように）
  [sheetHandle, document.querySelector(".sheet-peek")].forEach(function (el) {
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
  // つまみをタップしたら、次の大きさにする（full のときは peek にもどす）
  sheetHandle.addEventListener("click", function () {
    if (moved) return;
    const s = sheet.dataset.state;
    setSheet(s === "peek" ? "half" : s === "half" ? "full" : "peek");
  });
})();

// 「いつも見えている部分」の高さ（px）
function peekHeight() {
  return document.querySelector(".sheet-handle").offsetHeight + document.querySelector(".sheet-peek").offsetHeight;
}
// 実際の高さを測って style.css の --peek に入れる（地図の下端と現在地ボタンの位置がこれで決まる）。
// 文字の大きさの設定などで高さが変わっても、ずれないようにするため
function fitPeek() {
  document.documentElement.style.setProperty("--peek", peekHeight() + "px");
  map.invalidateSize(); // 地図の大きさが変わったことを Leaflet に知らせる
}
window.addEventListener("resize", fitPeek);


// ---------- スポット一覧 ----------
const listEl = document.getElementById("list");
const listOpen = true; // 一覧はいつも引き出しの中にある

// 距離を読みやすい形にする（例：85m、1.2km）
function formatDistance(m) {
  if (m < 1000) return "約" + Math.round(m) + "m";
  return "約" + (m / 1000).toFixed(1) + "km";
}

// 一覧は2つのタブに分ける：「スポット」（BGS・小ネタ・おすすめメニュー）と「隠れミッキー」
let listTab = "spots";

function renderList() {
  const showHidden = listTab === "hidden";

  // タブの見た目と、タブごとに出すもの（進捗は隠れミッキー、投稿の案内はスポット）
  document.getElementById("tab-spots").classList.toggle("active", !showHidden);
  document.getElementById("tab-hidden").classList.toggle("active", showHidden);
  document.getElementById("list-progress-box").classList.toggle("hidden", !showHidden);

  // 今のタブのスポットだけを取り出して、「自分からの距離」をつける（位置がまだわからなければ null）
  const items = SPOTS
    .filter(function (spot) { return (spot.category === "hidden") === showHidden; })
    .map(function (spot) {
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

  let note = lastPos
    ? "近い順に並んでいます。タップすると読めます"
    : "現在地がわかると近い順に並びます（「GPSで歩く」を押してください）";
  if (showHidden) note += "。見つけるまでは、ヒントだけが出ます";
  if (items.length === 0) note = "まだありません";
  document.getElementById("list-note").textContent = note;

  const ul = document.getElementById("list-items");
  ul.innerHTML = ""; // いったん空にして作り直す

  items.forEach(function (item) {
    const cat = CATEGORY[item.spot.category];

    const btn = document.createElement("button");
    btn.className = "list-item";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = cat.label;
    badge.style.setProperty("--c", cat.color);

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

// 投稿フォームのURLが設定されていれば、ボタンを出す
if (SUBMIT_FORM_URL) {
  const link = document.getElementById("submit-link");
  link.href = SUBMIT_FORM_URL;
  link.classList.remove("hidden");
  document.getElementById("submit-unready").classList.add("hidden");
}

document.getElementById("tab-spots").addEventListener("click", function () {
  listTab = "spots";
  renderList();
});
document.getElementById("tab-hidden").addEventListener("click", function () {
  listTab = "hidden";
  renderList();
});


// ---------- デバッグ表示（パークでの実地テスト用） ----------
// GPSの誤差や、各スポットまでの距離を画面に出して、
// 「座標や半径が合っているか」をその場で確かめられるようにする
const debugEl = document.getElementById("debug");
const btnDebug = document.getElementById("btn-debug");
const ACCURACY_WARN = 30; // 誤差がこれ（m）より大きいと黄色で注意を出す
let updateCount = 0;      // 位置を受け取った回数（GPSが動いているかの目安）
let debugOn = loadDebugSetting();

// ON/OFF はこの端末に覚えておく（アプリを開き直しても続く）
function loadDebugSetting() {
  try {
    return localStorage.getItem("debug") === "on";
  } catch (e) {
    return false;
  }
}
function saveDebugSetting() {
  try {
    localStorage.setItem("debug", debugOn ? "on" : "off");
  } catch (e) { /* 保存できなくても続行 */ }
}

// 12:34:56 のような時刻の文字にする
function formatTime(date) {
  return date.toTimeString().slice(0, 8);
}

// 1行分の要素を作る小さな道具
function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function renderDebug() {
  const info = document.getElementById("debug-info");
  const ul = document.getElementById("debug-spots");
  info.innerHTML = "";
  ul.innerHTML = "";

  info.appendChild(makeEl("div", "", "モード：" + (mode === "gps" ? "GPS" : "デモ") + "　受信回数：" + updateCount));

  if (!lastPos) {
    info.appendChild(makeEl("div", "", "位置はまだありません"));
    return;
  }

  const acc = Math.round(lastPos.accuracy);
  info.appendChild(makeEl("div", acc > ACCURACY_WARN ? "warn" : "",
    "誤差：±" + acc + "m" + (acc > ACCURACY_WARN ? "（大きめ。判定がずれるかも）" : "")));
  info.appendChild(makeEl("div", "", "位置：" + lastPos.lat.toFixed(6) + ", " + lastPos.lng.toFixed(6)));
  info.appendChild(makeEl("div", "", "更新：" + formatTime(lastPos.time)));

  // 各スポットまでの距離を近い順に。「距離 / 反応する半径」で、範囲の中なら「圏内」
  // （表示の切り替えで選んでいる種類だけ）
  SPOTS
    .filter(isShown)
    .map(function (spot) {
      return { spot: spot, d: distanceMeters(lastPos.lat, lastPos.lng, spot.lat, spot.lng) };
    })
    .sort(function (a, b) { return a.d - b.d; })
    .forEach(function (item) {
      const isIn = item.d <= item.spot.radius;
      const li = document.createElement("li");
      li.append(
        makeEl("span", "name", item.spot.name),
        makeEl("span", "", Math.round(item.d) + "m / " + item.spot.radius + "m"),
        makeEl("span", isIn ? "in" : "", isIn ? "圏内" : "　　")
      );
      ul.appendChild(li);
    });
}

function applyDebug() {
  debugEl.classList.toggle("hidden", !debugOn);
  btnDebug.classList.toggle("on", debugOn);
  if (debugOn) renderDebug();
}

btnDebug.addEventListener("click", function () {
  debugOn = !debugOn;
  saveDebugSetting();
  applyDebug();
  closeMenu();
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
  catEl.style.setProperty("--c", cat.color); // 札の色（style.css の var(--c) で使う）

  const srcEl = document.getElementById("card-source");
  srcEl.textContent = SOURCE[spot.source] || "";
  srcEl.classList.toggle("theory", spot.source === "theory");
  srcEl.classList.toggle("hidden", !spot.source); // おすすめメニューなど、source がなければ札を出さない

  document.getElementById("card-title").textContent = spot.name;

  // 隠れミッキーで、まだ見つけていなければ「ヒント」だけ見せる
  const isHiddenUnfound = spot.category === "hidden" && !found.has(spot.id);
  document.getElementById("card-body").textContent = isHiddenUnfound ? spot.hint : spot.body;

  // スポットの写真（隠れミッキーは答えがばれないよう、見つけるまで出さない）
  const figure = document.getElementById("card-figure");
  if (spot.image && !isHiddenUnfound) {
    document.getElementById("card-image").src = spot.image;
    document.getElementById("card-caption").textContent = spot.imageCaption || "";
    figure.classList.remove("hidden");
  } else {
    figure.classList.add("hidden");
  }

  // 答え合わせのボタン：正解の写真があれば「写真で答え合わせ」を主役にする
  document.getElementById("card-actions").classList.toggle("hidden", !isHiddenUnfound);
  photoBtn.classList.toggle("hidden", !spot.answerImage);
  foundBtn.textContent = spot.answerImage ? "写真なしで答えを見る" : "見つけた！";
  foundBtn.classList.toggle("primary", !spot.answerImage);
  compareEl.classList.add("hidden");

  // 見つけたあとは、自分が撮った写真を出す（撮っていなければ出さない）
  showMyPhoto(spot);

  // 隠れミッキーのカードには、進捗も出す
  const progressEl = document.getElementById("card-progress");
  progressEl.textContent = progressText();
  progressEl.classList.toggle("hidden", spot.category !== "hidden");

  // 引き出しの中身を、一覧からカードに入れかえる。小さくしていたら半分まで広げる
  listEl.classList.add("hidden");
  card.classList.remove("hidden");
  sheetBody.scrollTop = 0;
  if (sheet.dataset.state === "peek") setSheet("half");
}

// カードを閉じて、一覧にもどす
function closeCard() {
  card.classList.add("hidden");
  listEl.classList.remove("hidden");
  renderList();
}

// 見つけたことにする（「見つけた！」「合ってた！」の両方から使う）
function markFound(spot) {
  found.add(spot.id);
  saveFound();
  showCard(spot); // 答えと、増えた進捗を表示し直す
  renderList();   // 一覧の進捗と「発見済み」も更新
}

foundBtn.addEventListener("click", function () {
  if (currentSpot) markFound(currentSpot);
});


// ---------- 隠れミッキーの写真で答え合わせ ----------
// 流れ：カメラで撮る → 撮った写真と正解の写真を並べる → 自分で「合ってた！」を押す
const photoBtn = document.getElementById("card-photo");
const photoInput = document.getElementById("photo-input");
const compareEl = document.getElementById("compare");
let pendingPhoto = null; // 撮ったけれど、まだ「合ってた！」を押していない写真

photoBtn.addEventListener("click", openCamera);
document.getElementById("compare-retry").addEventListener("click", openCamera);

// 写真が撮れたら（アプリ内カメラ・端末のカメラのどちらからでも）ここに来る
function handlePhoto(blob) {
  if (!currentSpot) return;
  pendingPhoto = blob;
  setImageFromBlob(document.getElementById("compare-mine"), blob);
  document.getElementById("compare-answer").src = currentSpot.answerImage;
  document.getElementById("card-actions").classList.add("hidden");
  compareEl.classList.remove("hidden");
}

// 予備：アプリ内カメラが使えないときは、端末のカメラアプリで撮る
function openSystemCamera() {
  photoInput.value = ""; // 同じ写真を選び直しても反応するように空にする
  photoInput.click();    // 見えない <input type="file"> を押したことにする → カメラが開く
}
photoInput.addEventListener("change", function () {
  const file = photoInput.files[0];
  if (!file) return;
  // スマホの写真は大きいので、保存する前に小さくする
  shrinkPhoto(file, 1000).then(handlePhoto);
});


// ---------- アプリ内カメラ ----------
// getUserMedia … ブラウザからカメラの映像を受け取る仕組み。
// 映像を <video> に流して見せ、シャッターを押した瞬間の1コマを <canvas> に写し取って写真にする
const cameraEl = document.getElementById("camera");
const cameraVideo = document.getElementById("camera-video");
let cameraStream = null; // カメラの映像の流れ（使い終わったら必ず止める）

function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    openSystemCamera(); // 古いブラウザなど
    return;
  }
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } }, // スマホの外側（背面）のカメラ
    audio: false
  }).then(function (stream) {
    cameraStream = stream;
    // 電話がかかってきた等でカメラが途中で止まったら、真っ黒な画面のままにしない
    stream.getVideoTracks().forEach(function (track) {
      track.addEventListener("ended", closeCamera);
    });
    cameraVideo.srcObject = stream;
    cameraEl.classList.remove("hidden");
    return cameraVideo.play();
  }).catch(function () {
    // カメラの許可がない・カメラがない など → 端末のカメラアプリで撮る
    closeCamera();
    openSystemCamera();
  });
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (track) { track.stop(); }); // カメラを止める（ランプも消える）
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraEl.classList.add("hidden");
}

document.getElementById("camera-shutter").addEventListener("click", function () {
  const w = cameraVideo.videoWidth;
  const h = cameraVideo.videoHeight;
  if (!w || !h) return; // まだ映像が来ていない

  // 長い辺が 1000px になるように縮めて、今の1コマを写し取る
  const scale = Math.min(1, 1000 / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

  closeCamera();
  canvas.toBlob(function (blob) {
    if (blob) handlePhoto(blob);
  }, "image/jpeg", 0.8);
});

document.getElementById("camera-cancel").addEventListener("click", closeCamera);
document.getElementById("camera-album").addEventListener("click", function () {
  closeCamera();
  openSystemCamera();
});

document.getElementById("compare-yes").addEventListener("click", function () {
  if (!currentSpot || !pendingPhoto) return;
  const spot = currentSpot;
  savePhoto(spot.id, pendingPhoto).finally(function () {
    pendingPhoto = null;
    markFound(spot);
  });
});

// 写真を、長い辺が maxSize px になるまで縮めて JPEG にする
function shrinkPhoto(file, maxSize) {
  return new Promise(function (resolve) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) { resolve(blob || file); }, "image/jpeg", 0.8);
    };
    img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// Blob（写真のデータ）を <img> に表示する
function setImageFromBlob(imgEl, blob) {
  if (imgEl.dataset.url) URL.revokeObjectURL(imgEl.dataset.url); // 前の写真の分を片付ける
  imgEl.dataset.url = URL.createObjectURL(blob);
  imgEl.src = imgEl.dataset.url;
}

function showMyPhoto(spot) {
  const fig = document.getElementById("card-myphoto");
  fig.classList.add("hidden");
  if (spot.category !== "hidden" || !found.has(spot.id)) return;
  loadPhoto(spot.id).then(function (blob) {
    if (!blob || currentSpot !== spot) return; // 読み込み中に別のカードに変わっていたら出さない
    setImageFromBlob(document.getElementById("card-myphoto-img"), blob);
    fig.classList.remove("hidden");
  });
}


// ---------- 撮った写真の保存（IndexedDB） ----------
// 写真は大きいので localStorage（5MBくらいまで）ではなく、
// 大きなデータを入れられる「IndexedDB」という端末内のデータベースに入れる
function openPhotoDB() {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open("park-guide", 1);
    req.onupgradeneeded = function () { req.result.createObjectStore("photos"); }; // 初回だけ棚を作る
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}
function savePhoto(id, blob) {
  return openPhotoDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put(blob, id);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }).catch(function () { /* 保存できなくても続行 */ });
}
function loadPhoto(id) {
  return openPhotoDB().then(function (db) {
    return new Promise(function (resolve) {
      const req = db.transaction("photos").objectStore("photos").get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { resolve(null); };
    });
  }).catch(function () { return null; });
}

document.getElementById("card-close").addEventListener("click", closeCard);

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
  askNotificationPermission();
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

// ---------- 範囲に入ったときの通知 ----------
// 注意：Webサイトの通知は「アプリを開いている間」しか出せない
//       （画面を消したり、別のアプリに切り替えたりすると GPS も止まるため）
// iPhone は「ホーム画面に追加」したアプリからでないと通知が使えない（iOS 16.4 以降）

// 通知を出してよいか、最初の1回だけ聞く（GPSボタンを押したときに呼ぶ）
function askNotificationPermission() {
  if (!("Notification" in window)) return; // 通知が使えない環境（iPhoneのSafariのタブなど）
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notifyNearby(spot) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;
  // 通知は Service Worker から出す（Android の Chrome はこの方法しか受け付けない）
  navigator.serviceWorker.ready.then(function (reg) {
    reg.showNotification("近くに" + CATEGORY[spot.category].label + "があります", {
      body: spot.name + "　立ち止まって読んでみてください",
      icon: "icons/icon-192.png",
      tag: spot.id // 同じスポットの通知は1つにまとめる
    });
  }).catch(function () { /* 通知できなくても続行 */ });
}

function stopGps() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// 下の大きなボタン1つで GPS をつけたり消したりする（消すとデモにもどる）
const btnDemo = document.getElementById("btn-demo");
const btnGps = document.getElementById("btn-gps");

function setMode(newMode) {
  mode = newMode;
  const gps = mode === "gps";
  btnGps.setAttribute("aria-pressed", gps ? "true" : "false");
  btnGps.textContent = gps ? "GPSで案内中（止める）" : "GPSで歩く";
  btnDemo.classList.toggle("on", !gps);
  if (gps) {
    startGps();
    following = true; // GPS をつけたら、地図が自分についてくる
    btnLocate.classList.add("active");
  } else {
    stopGps();
    setStatus("デモ中：地図をタップすると、そこに「自分」が移動します");
  }
  if (debugOn) renderDebug();
}

btnGps.addEventListener("click", function () {
  setMode(mode === "gps" ? "demo" : "gps");
});
btnDemo.addEventListener("click", function () {
  setMode("demo");
  closeMenu();
});


// ---------- 現在地ボタン ----------
// 押すと地図を自分の位置にもどし、そのあとは歩くと地図がついてくる（following）。
// 指で地図を動かしたら、ついてくるのをやめる（見たい場所を見ていられるように）
const btnLocate = document.getElementById("btn-locate");
let following = false;

btnLocate.addEventListener("click", function () {
  if (!lastPos) {
    if (mode !== "gps") setMode("gps"); // 位置がまだなければ GPS をつける
    return;
  }
  following = true;
  btnLocate.classList.add("active");
  map.setView([lastPos.lat, lastPos.lng], Math.max(map.getZoom(), 18));
});
map.on("dragstart", function () {
  following = false;
  btnLocate.classList.remove("active");
});


// ---------- メニュー ----------
const menuEl = document.getElementById("menu");
function openMenu() { menuEl.classList.remove("hidden"); }
function closeMenu() { menuEl.classList.add("hidden"); }
document.getElementById("btn-menu").addEventListener("click", openMenu);
document.getElementById("menu-close").addEventListener("click", closeMenu);
// 暗いところ（メニューの外）をタップしても閉じる
menuEl.addEventListener("click", function (e) { if (e.target === menuEl) closeMenu(); });

// ---------- 位置編集モード ----------
// パークでスポットの位置と半径を直すためのモード。
//   - 地図の「◎」をドラッグすると、そのスポットが動く
//   - 「今いる場所にする」で、GPSの現在地をスポットの位置にする
//   - 直した値はこの端末に保存され（上の spotEdits）、「コピー」で spots.js 用の文字にできる
const editBar = document.getElementById("editbar");
const btnEdit = document.getElementById("btn-edit");
let editOn = false;
let editSpot = null;   // 今選んでいるスポット
let editHandles = [];  // ドラッグ用の「◎」

function round6(n) {
  return Math.round(n * 1000000) / 1000000; // 小数点以下6桁（約10cm単位）で十分
}

// スポットを動かして、地図の円と点もついてこさせる
function moveSpot(spot, lat, lng) {
  spot.lat = round6(lat);
  spot.lng = round6(lng);
  spotLayers[spot.id].circle.setLatLng([spot.lat, spot.lng]);
  spotLayers[spot.id].dot.setLatLng([spot.lat, spot.lng]);
}

// 直した値を端末に保存する。spots.js と同じ値に戻ったら、直しは消す
function saveSpotEdit(spot) {
  const now = { lat: spot.lat, lng: spot.lng, radius: spot.radius };
  if (sameValues(now, ORIGINAL[spot.id])) {
    delete spotEdits[spot.id];
  } else {
    now.base = ORIGINAL[spot.id]; // どの spots.js の値をもとに直したか
    spotEdits[spot.id] = now;
  }
  saveEdits();
  renderEditBar();
  inside.delete(spot.id); // 動かしたので、範囲の判定をやり直す
  if (debugOn) renderDebug();
  if (listOpen) renderList();
}

function renderEditBar() {
  const count = Object.keys(spotEdits).length;
  document.getElementById("edit-copy").textContent = "直した内容をコピー（" + count + "件）";

  const controls = document.getElementById("edit-controls");
  if (!editSpot) {
    document.getElementById("edit-target").textContent = "地図の ◎ をタップして選ぶか、ドラッグして動かします";
    controls.classList.add("hidden");
    return;
  }
  const edited = spotEdits[editSpot.id] ? "（直し中）" : "";
  document.getElementById("edit-target").textContent = editSpot.name + edited;
  document.getElementById("edit-values").textContent =
    "緯度 " + editSpot.lat + "　経度 " + editSpot.lng + "　半径 " + editSpot.radius + "m";
  controls.classList.remove("hidden");
}

function selectEditSpot(spot) {
  editSpot = spot;
  renderEditBar();
}

function startEdit() {
  editOn = true;
  btnEdit.classList.add("on");
  closeMenu();
  document.body.classList.add("editing"); // 引き出しをしまって、地図を広く使う
  map.invalidateSize();

  SPOTS.filter(isShown).forEach(function (spot) { // 表示中の種類だけ ◎ を出す
    const handle = L.marker([spot.lat, spot.lng], {
      draggable: true,
      icon: L.divIcon({ className: "edit-handle", iconSize: [28, 28] })
    }).addTo(map);
    handle.on("click", function () { selectEditSpot(spot); });
    handle.on("drag", function (e) {
      const p = e.target.getLatLng();
      moveSpot(spot, p.lat, p.lng);
    });
    handle.on("dragend", function () {
      selectEditSpot(spot);
      saveSpotEdit(spot);
    });
    spotLayers[spot.id].handle = handle;
    editHandles.push(handle);
  });

  editBar.classList.remove("hidden");
  renderEditBar();
}

function stopEdit() {
  editOn = false;
  editSpot = null;
  btnEdit.classList.remove("on");
  editHandles.forEach(function (h) { map.removeLayer(h); });
  editHandles = [];
  editBar.classList.add("hidden");
  document.body.classList.remove("editing");
  map.invalidateSize();
}

btnEdit.addEventListener("click", function () {
  if (editOn) stopEdit(); else startEdit();
});
document.getElementById("edit-close").addEventListener("click", stopEdit);

// 半径を 5m ずつ変える（5m より小さくはしない）
function changeRadius(delta) {
  if (!editSpot) return;
  editSpot.radius = Math.max(5, editSpot.radius + delta);
  spotLayers[editSpot.id].circle.setRadius(editSpot.radius);
  saveSpotEdit(editSpot);
}
document.getElementById("edit-radius-down").addEventListener("click", function () { changeRadius(-5); });
document.getElementById("edit-radius-up").addEventListener("click", function () { changeRadius(5); });

// 今いる場所（GPSモードなら本物の現在地、デモなら最後にタップした場所）をスポットの位置にする
document.getElementById("edit-here").addEventListener("click", function () {
  if (!editSpot) return;
  if (!lastPos) {
    setStatus("現在地がまだわかりません。GPSをオンにしてください");
    return;
  }
  moveSpot(editSpot, lastPos.lat, lastPos.lng);
  spotLayers[editSpot.id].handle.setLatLng([editSpot.lat, editSpot.lng]);
  saveSpotEdit(editSpot);
});

document.getElementById("edit-reset").addEventListener("click", function () {
  if (!editSpot) return;
  const o = ORIGINAL[editSpot.id];
  editSpot.radius = o.radius;
  spotLayers[editSpot.id].circle.setRadius(o.radius);
  moveSpot(editSpot, o.lat, o.lng);
  spotLayers[editSpot.id].handle.setLatLng([o.lat, o.lng]);
  saveSpotEdit(editSpot);
});

// 直したスポットを、spots.js にそのまま書き写せる形の文字にする
function editsText() {
  return SPOTS
    .filter(function (spot) { return spotEdits[spot.id]; })
    .map(function (spot) {
      return "// " + spot.name + "（id: \"" + spot.id + "\"）\n" +
             "    lat: " + spot.lat + ",\n" +
             "    lng: " + spot.lng + ",\n" +
             "    radius: " + spot.radius + ",";
    })
    .join("\n\n");
}

document.getElementById("edit-copy").addEventListener("click", function () {
  const text = editsText();
  if (!text) {
    setStatus("まだ直したスポットはありません");
    return;
  }
  // クリップボードにコピー。できない環境では、選んでコピーできる窓を出す
  const fallback = function () { window.prompt("この文字をコピーしてください", text); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function () { setStatus("コピーしました。spots.js の同じ id のところに書き写してください"); })
      .catch(fallback);
  } else {
    fallback();
  }
});


// ---------- 画面を消さない（Wake Lock） ----------
// スマホは、しばらく触らないと画面が自動で消える。画面が消えると GPS も止まって通知も来ない。
// Wake Lock（ウェイクロック）は「この画面を消さないで」とスマホに頼む仕組み。
// ただし、アプリを閉じたり別のアプリに切り替えたりすると、スマホが自動で解除する。
// そのため、アプリに戻ってきたときにもう一度頼み直す。
const btnScreen = document.getElementById("btn-screen");
let screenWanted = loadScreenSetting(); // 利用者がONにしているか
let wakeLock = null;                    // スマホから受け取った「消さない約束」

function loadScreenSetting() {
  try {
    return localStorage.getItem("keepScreenOn") === "on";
  } catch (e) {
    return false;
  }
}
function saveScreenSetting() {
  try {
    localStorage.setItem("keepScreenOn", screenWanted ? "on" : "off");
  } catch (e) { /* 保存できなくても続行 */ }
}

function renderScreenButton() {
  const on = screenWanted && wakeLock !== null;
  btnScreen.textContent = on ? "画面ON中" : "画面を消さない";
  btnScreen.classList.toggle("on", on);
  btnScreen.setAttribute("aria-pressed", on ? "true" : "false");
}

function requestWakeLock() {
  if (!screenWanted || wakeLock || document.visibilityState !== "visible") return;
  navigator.wakeLock.request("screen").then(function (lock) {
    wakeLock = lock;
    // スマホの都合で解除されたとき（アプリを切り替えた等）
    lock.addEventListener("release", function () {
      wakeLock = null;
      renderScreenButton();
    });
    renderScreenButton();
  }).catch(function () {
    // 電池残量が少ない・省電力モード などで断られることがある。
    // 断られたら OFF に戻す（ボタンの表示と設定を食い違わせない）
    wakeLock = null;
    screenWanted = false;
    saveScreenSetting();
    renderScreenButton();
    setStatus("画面を消さない設定ができませんでした（省電力モードなどを確認してください）");
  });
}

function releaseWakeLock() {
  if (wakeLock) wakeLock.release(); // release イベントで wakeLock が null に戻る
}

if ("wakeLock" in navigator) {
  btnScreen.classList.remove("hidden");
  btnScreen.addEventListener("click", function () {
    screenWanted = !screenWanted;
    saveScreenSetting();
    if (screenWanted) {
      requestWakeLock();
      setStatus("画面を消さないようにしました。電池の減りが早くなるので、使わないときはOFFにしてください");
    } else {
      releaseWakeLock();
    }
    renderScreenButton();
  });
  // アプリに戻ってきたら、頼み直す
  document.addEventListener("visibilitychange", requestWakeLock);
  requestWakeLock(); // 前回ONにしていたら、開いたときにもう一度頼む
  renderScreenButton();
}


// 開いたときに、デバッグ表示の前回の ON/OFF と、表示の切り替えを反映
// （mode などの準備が全部終わったここで呼ぶ）
applyDebug();
applyFilterToMap();
if (viewFilter === "hidden") listTab = "hidden";
setMode("demo");
renderList();
fitPeek();


// ---------- オフライン対応（Service Worker の登録） ----------
// sw.js を「門番」として登録する。対応していないブラウザでは何もしない
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function (e) {
    console.warn("Service Worker を登録できませんでした", e);
  });
}
