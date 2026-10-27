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
//              / "food"（おすすめメニュー）
//   source   … "official"（公式情報） / "theory"（諸説あり・ファンの考察）
//              おすすめメニューのような感想には書かない（書かなければ札は出ない）
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
// 内容は公式ガイドブックで読んだもの（何ページかなどの細かい出典は未整理）

const SPOTS = [
  {
    id: "main-entrance",
    name: "メインエントランス",
    lat: 35.635304,
    lng: 139.879029,
    radius: 40,
    category: "trivia",
    source: "official",
    body: "舞浜が選ばれたのは、場所的に雨が少ないから。"
  },
  {
    id: "world-bazaar",
    name: "ワールドバザール",
    lat: 35.634615,
    lng: 139.879437,
    radius: 25,
    category: "trivia",
    source: "official",
    body: "・建物の窓は、上に行くほど小さくなっている。\n・ワールドバザールに屋根があるのは東京だけ。\n・開園日は雨だったので、開園式は屋根のあるワールドバザールで行われた。"
  },
  {
    id: "pirates",
    name: "カリブの海賊",
    lat: 35.634305,
    lng: 139.880676,
    radius: 20,
    category: "trivia",
    source: "official",
    body: "・船は全部で45隻あり、どれにも女性の名前がついている。\n・出発するところでは、流れ星が流れる。\n・奥には、香水などが買えるショップがある。\n・中に出てくる「チャーリー・サム」は、ビッグサンダー・マウンテンの「セドナ・サム」の兄弟という設定。"
  },
  {
    id: "cafe-orleans",
    name: "カフェ・オーリンズ",
    lat: 35.634185,
    lng: 139.881167,
    radius: 15,
    category: "food",
    body: "ガンボスープがおいしい。"
  },
  {
    id: "jungle-carnival",
    name: "ジャングルカーニバル",
    lat: 35.633983,
    lng: 139.881795,
    radius: 10,
    category: "trivia",
    source: "official",
    body: "時期によって難易度が変わる。"
  },
  {
    id: "jungle-cruise",
    name: "ジャングルクルーズ",
    lat: 35.633876,
    lng: 139.882382,
    radius: 15,
    category: "bgs",
    source: "official",
    body: "サムは、売り物を3回変えている（生首、像、お守り）。"
  },
  {
    id: "tiki-room",
    name: "魅惑のチキルーム",
    lat: 35.6331,
    lng: 139.8822,
    radius: 15,
    category: "trivia",
    source: "official",
    body: "椅子が暖かい。"
  },
  {
    // 「ツリーハウス」はスイスファミリー・ツリーハウスとして置いている（要確認）
    id: "swiss-family-treehouse",
    name: "スイスファミリー・ツリーハウス",
    lat: 35.633316,
    lng: 139.88191,
    radius: 10,
    category: "trivia",
    source: "official",
    body: "ツリーハウスの穴から、虎の鳴き声が聞こえる。"
  },
  {
    id: "falls",
    name: "アドベンチャーランドとウエスタンランドの間の滝",
    lat: 35.633084,
    lng: 139.881846,
    radius: 10,
    category: "trivia",
    source: "official",
    body: "2つのエリアのBGMが混ざらないようにしている。"
  },
  {
    id: "western-river-railroad",
    name: "ウエスタンリバー鉄道",
    lat: 35.6337,
    lng: 139.8824,
    radius: 15,
    category: "trivia",
    source: "official",
    body: "・本物の蒸気で走っている。\n・ランドの周辺を歩いていると、汽笛の音が聞こえる。\n・駅はアドベンチャーランドにしかない。当時の法律では、お金を取らないと駅を2つ作れなかったから。"
  },
  {
    id: "shooting-gallery",
    name: "ウエスタンランド・シューティングギャラリー",
    lat: 35.6326,
    lng: 139.8833,
    radius: 30,
    category: "trivia",
    source: "official",
    body: "ラッキーの的がある。"
  },
  {
    id: "big-thunder",
    name: "ビッグサンダー・マウンテン",
    lat: 35.6326,
    lng: 139.8835,
    radius: 50,
    category: "trivia",
    source: "official",
    body: "・乗り場の横の蒸気トラクターは、レプリカではなく1898年製の本物。持ち主の奥さんが「トラクターより旅行に行きたい」と言ったので、譲ってもらえた。\n・山の高さは33m、コースは1,000m、最高時速は42km。\n・巻き上げの途中でキラキラ光っているのは、金の鉱脈。\n・コースには、オポッサム、コヨーテ、ビッグホーンシープ、コウモリ、ガラガラヘビがいる。\n・山にいる「セドナ・サム」は、カリブの海賊の「チャーリー・サム」の兄弟という設定。\n・セドナ・サムは乗っているときには見えない場所にいて、マークトウェイン号やウエスタンリバー鉄道から見える。"
  },
  {
    id: "american-river",
    name: "アメリカ河と蒸気船マークトウェイン号",
    lat: 35.631838,
    lng: 139.884288,
    radius: 40,
    category: "trivia",
    source: "official",
    body: "・開園のとき、アメリカのミシシッピ川から汲んできた水が注がれた。\n・マークトウェイン号は法律上の「船」として登録されているので、船体の前と後ろに船名と「浦安市」の表示がある。"
  },
  {
    id: "tom-sawyer-raft",
    name: "トムソーヤ島いかだ",
    lat: 35.631928,
    lng: 139.883747,
    radius: 20,
    category: "trivia",
    source: "official",
    body: "島が暗くなるので、いかだは日没で運航を終える。"
  },
  {
    id: "critter-country",
    name: "クリッターカントリー",
    lat: 35.630577,
    lng: 139.883465,
    radius: 40,
    category: "trivia",
    source: "official",
    body: "・1992年にできた、6番目のテーマランド。\n・もとはスプラッシュ・マウンテンだけの計画だったが、アメリカのディズニー側の意向で、エリアごと作ることになった。"
  },
  {
    id: "splash-mountain",
    name: "スプラッシュ・マウンテン",
    lat: 35.630506,
    lng: 139.882898,
    radius: 35,
    category: "trivia",
    source: "official",
    body: "・最後の落下は、高さ約16m・傾き45度・時速約62kmで、ランドでいちばん速い。\n・山はもともと「チカピンヒル」という丘。密造酒の蒸留器が爆発してダムが壊れ、「水しぶきの山」と呼ばれるようになった。\n・ランドで水しぶきを浴びるのはここだけ。水の量は日本の気候に合わせて調整している。"
  },
  {
    id: "cinderella-castle",
    name: "シンデレラ城",
    lat: 35.632077,
    lng: 139.880849,
    radius: 40,
    category: "trivia",
    source: "official",
    body: "・高さは約51m。てっぺんには業務用の無線アンテナがある。\n・上に行くほど石垣や窓が小さくなっていて、実際より高く見える。\n・1階の通路のモザイク画には、ディズニーのデザイナーの顔が描かれていて、本物の宝石も使われている。\n・いちばん高い金色の塔は、ウォルトがアメリカの「眠れる森の美女の城」の金色の塔を気に入っていたことから。"
  },
  {
    id: "haunted-mansion",
    name: "ホーンテッドマンション",
    lat: 35.630590,
    lng: 139.882182,
    radius: 30,
    category: "trivia",
    source: "official",
    body: "・屋敷には999人の幽霊がいて、1,000人目の仲間を探している。\n・出口のお墓の名前は、英語のダジャレになっている（例：「Harry After」＝here after）。\n・待ち時間が「4分」「9分」「13分」のような、縁起の悪い数字で表示されることがある。"
  },
  {
    id: "pooh-hunny-hunt",
    name: "プーさんのハニーハント",
    lat: 35.630233,
    lng: 139.880470,
    radius: 30,
    category: "trivia",
    source: "official",
    body: "・最後の場面では、ハチミツの香りがする。\n・開園記念日の4月15日にオープンする予定だったが、技術的なトラブルで2000年9月1日になった。"
  },
  {
    id: "mickeys-house",
    name: "ミッキーの家とミート・ミッキー",
    lat: 35.630250,
    lng: 139.878615,
    radius: 25,
    category: "trivia",
    source: "official",
    body: "オルガンの楽譜にはミッキーのマークが流れているが、1つだけグーフィーのマークが混ざっている。"
  },
  {
    id: "tomorrowland",
    name: "トゥモローランド",
    lat: 35.632893,
    lng: 139.878326,
    radius: 40,
    category: "trivia",
    source: "official",
    body: "未来っぽいデザインは、開園した1983年ごろに考えられていた「未来」。"
  },
  {
    id: "small-world",
    name: "イッツ・ア・スモールワールド",
    lat: 35.630695,
    lng: 139.880967,
    radius: 30,
    category: "trivia",
    source: "official",
    body: "・入口の時計塔は15分ごとにからくりが動き、世界の子どもの人形が出てきて時刻を知らせる。\n・2018年のリニューアルで、ディズニー映画18作品のキャラクター約40体が仲間入りした。"
  },
  {
    id: "philharmagic",
    name: "ミッキーのフィルハーマジック",
    lat: 35.631495,
    lng: 139.880641,
    radius: 25,
    category: "trivia",
    source: "official",
    body: "待ち列の壁の楽譜は「ミッキーマウス・マーチ」、大きな五線譜は「魔法使いの弟子」。"
  },
  {
    id: "beauty-and-the-beast",
    name: "美女と野獣“魔法のものがたり”",
    lat: 35.631192,
    lng: 139.878221,
    radius: 35,
    category: "trivia",
    source: "official",
    body: "この場所には、もとは「グランドサーキット・レースウェイ」があった。"
  },
  {
    id: "roger-rabbit",
    name: "ロジャーラビットのカートゥーンスピン",
    lat: 35.629583,
    lng: 139.880159,
    radius: 25,
    category: "bgs",
    source: "official",
    body: "道にまかれている「ディップ」は、トゥーンを溶かしてしまう液体。"
  },
  {
    id: "gadgets-go-coaster",
    name: "ガジェットのゴーコースター",
    lat: 35.630556,
    lng: 139.878698,
    radius: 25,
    category: "bgs",
    source: "official",
    body: "ガラクタを集めて作ったという設定なので、日用品っぽい部品があちこちに使われている。"
  },
  {
    id: "monsters-inc",
    name: "モンスターズ・インク“ライド＆ゴーシーク！”",
    lat: 35.633926,
    lng: 139.878324,
    radius: 35,
    category: "trivia",
    source: "official",
    body: "・オレンジの毛でヘルメットをかぶった、このアトラクションだけのモンスター「ロッキー」が、いろいろな場面に隠れている。\n・映画では足しか映らなかった大きなモンスター「テッド」の全身が、街の中に出てくる。"
  },

  // ===== 東京ディズニーシー =====
  {
    id: "hotel-miracosta",
    name: "ホテルミラコスタ",
    lat: 35.627301,
    lng: 139.887970,
    radius: 40,
    category: "trivia",
    source: "official",
    body: "日本で初めての、パークと一体になったホテル。"
  },
  {
    id: "ponte-dei-benvenuti",
    name: "ポンテ・デイ・ベンヴェヌーティ",
    lat: 35.625619,
    lng: 139.887128,
    radius: 15,
    category: "trivia",
    source: "official",
    body: "ゴンドラでこの橋の下をくぐるとき、目を閉じて願いごとをすると叶うと言われている。"
  },
  {
    id: "fortress-explorations",
    name: "フォートレス・エクスプロレーション",
    lat: 35.625769,
    lng: 139.885185,
    radius: 35,
    category: "trivia",
    source: "official",
    body: "・「チェインバー・オブ・プラネット」では、ハンドルを回して水星から土星までを動かせる。\n・ガリオン船「ルネサンス号」では、大砲を操作して撃つまねができる。"
  },
  {
    id: "ss-columbia",
    name: "S.S.コロンビア号",
    lat: 35.623385,
    lng: 139.887061,
    radius: 50,
    category: "bgs",
    source: "official",
    body: "・ニューヨークのエリアは、馬車から自動車へ、ガス灯から電灯へと変わっていく時代が舞台。\n・S.S.コロンビア号は、出港直前の最新型の豪華客船という設定。"
  },
  {
    id: "tower-of-terror",
    name: "タワー・オブ・テラー",
    lat: 35.624095,
    lng: 139.888268,
    radius: 40,
    category: "bgs",
    source: "official",
    body: "・ホテルハイタワーは、大富豪ハリソン・ハイタワー三世が1892年に開いた。\n・建物は、ゴシック、ヴィクトリア朝、ムガール、ムーアなど、ハイタワーが旅先で気に入った建築様式のごちゃまぜ。\n・ハイタワー三世は、1899年12月31日の記者会見のあと、エレベーターの中から消えた。\n・出口のショップは、ホテルの室内プール「ラジャのプール」を改装した設定で、飛び込み台が残っている。"
  },
  {
    id: "toy-story-mania",
    name: "トイ・ストーリー・マニア！",
    lat: 35.624585,
    lng: 139.889135,
    radius: 30,
    category: "trivia",
    source: "official",
    body: "・ウッディの口から入ると、おもちゃの大きさに縮むという設定。\n・まわりのトイビル・トロリーパークのモデルは、ニューヨーク・ブルックリンにあった遊園地「ルナパーク」。"
  },
  {
    id: "indiana-jones",
    name: "インディ・ジョーンズ・アドベンチャー",
    lat: 35.626712,
    lng: 139.880612,
    radius: 40,
    category: "bgs",
    source: "official",
    body: "このツアーは、助手のパコが博士の警告を無視して勝手に集めた観光ツアー。"
  },
  {
    id: "raging-spirits",
    name: "レイジングスピリッツ",
    lat: 35.627711,
    lng: 139.880818,
    radius: 35,
    category: "bgs",
    source: "official",
    body: "・2体の石像は、火の神「イクチュラコアトル」と水の神「アクトゥリクトゥリ」。\n・石像の顔を向かい合わせてはいけなかったのに、発掘チームが向かい合わせたので、神々が怒った。\n・一回転のループは、レールが神の力でねじ曲げられてできた。"
  },
  {
    id: "sindbad",
    name: "シンドバッド・ストーリーブック・ヴォヤッジ",
    lat: 35.628764,
    lng: 139.881617,
    radius: 30,
    category: "trivia",
    source: "official",
    body: "曲「コンパス・オブ・ユア・ハート」は、『アラジン』のアラン・メンケンがこのアトラクションのために作った。"
  },
  {
    id: "king-tritons-castle",
    name: "キング・トリトン・キャッスル",
    lat: 35.626987,
    lng: 139.882956,
    radius: 35,
    category: "bgs",
    source: "official",
    body: "・お城はサンゴでできていて、海から上がってきたばかりという設定。\n・城に入ると、2頭のイルカが引く戦車に乗ったトリトン王の金色の像がある。そこでトリトン王が魔法をかけて、海の中でも息ができるようになっている。"
  },
  {
    id: "scuttles-scooters",
    name: "スカットルのスクーター",
    lat: 35.627275,
    lng: 139.883210,
    radius: 20,
    category: "trivia",
    source: "official",
    body: "スカットルは、望遠鏡を反対側から覗いている。"
  },
  {
    id: "rapunzel-lantern-festival",
    name: "ラプンツェルのランタンフェスティバル",
    lat: 35.628985,
    lng: 139.879449,
    radius: 35,
    category: "trivia",
    source: "official",
    body: "ラプンツェルのセリフと歌は、中川翔子さん。"
  },
  {
    id: "center-of-the-earth",
    name: "センター・オブ・ジ・アース",
    lat: 35.625770,
    lng: 139.884080,
    radius: 35,
    category: "trivia",
    source: "official",
    body: "地底へ降りる「テラヴェーター」は地下800mまで行く。名前は、ラテン語の「地球」と「エレベーター」を合わせた言葉。"
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
