// =====================================================
// スポットのデータ
// ここを書き足していくと、ガイドのネタが増えていきます。
//
// 各項目の意味：
//   id       … スポットごとに違う名前（英数字）
//   name     … 画面に出るスポット名
//   lat, lng … 緯度・経度
//              Googleマップで場所を右クリック → 一番上の数字をクリックでコピーできます
//   radius   … 何メートル以内に入ったら反応するか
//   category … "bgs"（BGS＝バックグラウンドストーリー） / "hidden"（隠れミッキー） / "trivia"（小ネタ）
//   source   … "official"（公式設定） / "theory"（諸説あり・ファンの考察）
//   hint     … 隠れミッキーだけ使う。見つける前に出すヒント
//   body     … 本文（隠れミッキーの場合は「見つけた！」を押したあとに出る答え）
//              \n と書くと、そこで改行される（箇条書きにするときに使う）
//
// 画像（どれも省略できる）：
//   image        … カードに出す写真。images フォルダに入れて "images/ファイル名.jpg" と書く
//   imageCaption … 写真の下に出す短い説明
//   answerImage  … 隠れミッキーだけ使う。答え合わせで並べて見せる「正解の写真」
//                  これがあると「写真で答え合わせ」ボタンが出る
//   ※ 写真は自分で撮ったものだけを使う。公式サイトの写真やキャラクター画像は使わない
//   ※ スマホの写真は大きいので、横1200px くらいに縮めてから入れると読み込みが速い
// =====================================================

// 座標は OpenStreetMap の地図データから入れたもの。パークで実地確認して直すこと
// source は、公式設定か確認できるまで "theory"（諸説あり）にしている

const SPOTS = [
  {
    id: "main-entrance",
    name: "メインエントランス",
    lat: 35.6350,
    lng: 139.8792,
    radius: 50,
    category: "trivia",
    source: "theory",
    body: "舞浜が選ばれたのは、場所的に雨が少ないから。"
  },
  {
    id: "world-bazaar",
    name: "ワールドバザール",
    lat: 35.6343,
    lng: 139.8796,
    radius: 60,
    category: "trivia",
    source: "theory",
    body: "・建物の窓は、上に行くほど小さくなっている。\n・ワールドバザールに屋根があるのは東京だけ。"
  },
  {
    id: "pirates",
    name: "カリブの海賊",
    lat: 35.6348,
    lng: 139.8811,
    radius: 40,
    category: "trivia",
    source: "theory",
    body: "・船には、愛人の名前が書かれている。\n・出発するところでは、流れ星が流れる。\n・奥には、香水などが買えるショップがある。"
  },
  {
    // 位置未確認：地図データに見つからなかったので、アドベンチャーランドの中心に仮置き
    id: "jungle-carnival",
    name: "ジャングルカーニバル",
    lat: 35.6334,
    lng: 139.8814,
    radius: 30,
    category: "trivia",
    source: "theory",
    body: "時期によって難易度が変わる。"
  },
  {
    id: "jungle-cruise",
    name: "ジャングルクルーズ",
    lat: 35.6340,
    lng: 139.8824,
    radius: 40,
    category: "bgs",
    source: "theory",
    body: "サムは、売り物を3回変えている（生首、像、お守り）。"
  },
  {
    id: "tiki-room",
    name: "魅惑のチキルーム",
    lat: 35.6331,
    lng: 139.8822,
    radius: 30,
    category: "trivia",
    source: "theory",
    body: "椅子が暖かい。"
  },
  {
    // 「ツリーハウス」はスイスファミリー・ツリーハウスとして置いている（要確認）
    id: "swiss-family-treehouse",
    name: "スイスファミリー・ツリーハウス",
    lat: 35.6333,
    lng: 139.8818,
    radius: 30,
    category: "trivia",
    source: "theory",
    body: "ツリーハウスの穴から、虎の鳴き声が聞こえる。"
  },
  {
    // 位置未確認：地図データの「Schweitzer Falls」の位置に仮置き
    id: "falls",
    name: "アドベンチャーランドとウエスタンランドの間の滝",
    lat: 35.6337,
    lng: 139.8839,
    radius: 30,
    category: "trivia",
    source: "theory",
    body: "2つのエリアのBGMが混ざらないようにしている。"
  },
  {
    id: "western-river-railroad",
    name: "ウエスタンリバー鉄道",
    lat: 35.6337,
    lng: 139.8824,
    radius: 40,
    category: "trivia",
    source: "theory",
    body: "・本物の蒸気で走っている。\n・ランドの周辺を歩いていると、汽笛の音が聞こえる。"
  },
  {
    id: "shooting-gallery",
    name: "ウエスタンランド・シューティングギャラリー",
    lat: 35.6326,
    lng: 139.8833,
    radius: 30,
    category: "trivia",
    source: "theory",
    body: "ラッキーの的がある。"
  },
  {
    id: "big-thunder",
    name: "ビッグサンダー・マウンテン",
    lat: 35.6326,
    lng: 139.8835,
    radius: 50,
    category: "trivia",
    source: "theory",
    body: "前にある機関車は、レプリカではなく本物。"
  },
  {
    // 答え合わせ機能の見本。本物の隠れミッキーを入れたら消す
    id: "hidden-1",
    name: "隠れミッキー その1（仮の位置）",
    lat: 35.6318,
    lng: 139.8800,
    radius: 30,
    category: "hidden",
    source: "official",
    hint: "【サンプル】この付近に隠れミッキーがあるよ。〇〇のあたりを探してみて！",
    body: "【サンプル】答え：ここに具体的な場所の説明が入ります。",
    answerImage: "images/sample-answer.jpg"
  }
];
