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
const map = L.map("map", { zoomControl: false }).setView(PARK_CENTER, START_ZOOM);

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
    if (mode === "gps") notifyNearby(entered[0].spot); // 端末の通知も出す（音で気づける）
  }

  if (nearest) {
    setStatus("いちばん近いスポット：" + nearest.name + "（約" + Math.round(nearestDist) + "m）");
  }

  if (listOpen) renderList(); // 一覧を開いていたら、並び順と距離を更新
  if (debugOn) renderDebug(); // デバッグ表示も更新
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

btnList.addEventListener("click", function () {
  listOpen = !listOpen;
  listEl.classList.toggle("hidden", !listOpen);
  btnList.textContent = listOpen ? "地図" : "一覧";
  if (listOpen) renderList();
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
  SPOTS
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

  card.classList.remove("hidden");
}

// 見つけたことにする（「見つけた！」「合ってた！」の両方から使う）
function markFound(spot) {
  found.add(spot.id);
  saveFound();
  showCard(spot);             // 答えと、増えた進捗を表示し直す
  if (listOpen) renderList(); // 一覧の進捗と「発見済み」も更新
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

const btnDemo = document.getElementById("btn-demo");
const btnGps = document.getElementById("btn-gps");

btnDemo.addEventListener("click", function () {
  mode = "demo";
  stopGps();
  btnDemo.classList.add("active");
  btnGps.classList.remove("active");
  setStatus("地図をタップすると、そこに「自分」が移動します");
  if (debugOn) renderDebug();
});

btnGps.addEventListener("click", function () {
  mode = "gps";
  btnGps.classList.add("active");
  btnDemo.classList.remove("active");
  startGps();
  if (debugOn) renderDebug();
});

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
  card.classList.add("hidden");
  if (listOpen) btnList.click(); // 一覧を閉じて地図を出す

  SPOTS.forEach(function (spot) {
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


// 開いたときに、デバッグ表示の前回の ON/OFF を反映
// （mode などの準備が全部終わったここで呼ぶ）
applyDebug();


// ---------- オフライン対応（Service Worker の登録） ----------
// sw.js を「門番」として登録する。対応していないブラウザでは何もしない
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function (e) {
    console.warn("Service Worker を登録できませんでした", e);
  });
}
