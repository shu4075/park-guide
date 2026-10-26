// =====================================================
// create-form.gs … ネタ投稿用の Googleフォームを自動で作るスクリプト
//
// 使い方：
//   1. https://script.google.com を開き「新しいプロジェクト」
//   2. 最初から入っている文字を全部消して、このファイルの中身を貼り付ける
//   3. 上の「実行」を押す（初回は「権限を確認」→ 自分のアカウント →
//      「詳細」→「（安全ではないページ）に移動」→「許可」）
//   4. 下の「実行ログ」に出た「回答用URL」をコピーする
//   5. app.js の SUBMIT_FORM_URL = "" の "" の中に貼る
// 作られたフォームは、自分の Googleドライブに入っている
// =====================================================

function createSubmissionForm() {
  const form = FormApp.create("パークさんぽガイド ネタ投稿");

  form.setDescription(
    "パークのBGS・小ネタ・隠れミッキーを教えてください。\n" +
    "内容を確かめてから掲載します。掲載しないこともあります。\n\n" +
    "・本や他のサイトの文章は写さず、自分の言葉で書いてください\n" +
    "・どこで知ったか（出典）を書いてください\n" +
    "・写真は自分で撮ったものだけにしてください\n\n" +
    "※ 非公式ファンサイトです。運営会社とは関係ありません。"
  );
  form.setCollectEmail(false);       // メールアドレスは集めない
  form.setLimitOneResponsePerUser(false); // Googleログインなしで送れるように

  form.addMultipleChoiceItem()
    .setTitle("種類")
    .setChoiceValues(["BGS", "小ネタ", "隠れミッキー"])
    .setRequired(true);

  form.addTextItem()
    .setTitle("場所")
    .setHelpText("エリア名、アトラクション名、近くの目印など")
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("内容")
    .setHelpText("隠れミッキーの場合は、見つけ方のヒントと答え（場所）を書いてください")
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("出典")
    .setHelpText("例：公式サイトのページ、ガイドツアー、キャストさんの説明、自分で見つけた など")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("公式設定か、考察か")
    .setChoiceValues(["公式設定", "考察・諸説あり", "わからない"])
    .setRequired(true);

  form.addTextItem()
    .setTitle("写真のURL（任意）")
    .setHelpText("Googleドライブなどで共有した、自分で撮った写真のリンク");

  form.addTextItem()
    .setTitle("掲載するときの名前（任意）")
    .setHelpText("出典として表示することがあります。空欄なら名前は出しません");

  form.addCheckboxItem()
    .setTitle("確認")
    .setChoiceValues(["上の注意を読みました"])
    .setRequired(true);

  // 最近の Googleフォームは、スクリプトで作ると「非公開」で始まることがあるので公開にする
  if (typeof form.setPublished === "function") {
    form.setPublished(true);
  }

  Logger.log("回答用URL（app.js に貼る）： " + form.getPublishedUrl());
  Logger.log("編集用URL（質問を直すとき）： " + form.getEditUrl());
}
