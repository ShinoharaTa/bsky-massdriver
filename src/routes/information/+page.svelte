<div class="info-wrapper">
  <div class="brand-center">
    <img src="/massdriver-icon.svg" alt="Mass Driver" width="30" height="30" />
    <h1>使い方ガイド</h1>
  </div>

  <section class="info-section">
    <h2>Mass Driver とは？</h2>
    <p>
      Bluesky への投稿をもっと便利にするための専用アプリです。<br />
      複数アカウントへの同時投稿や、画像の自動リサイズなど、日々のポストを快適にする機能が詰まっています。
    </p>
  </section>

  <section class="quick-start">
    <h2>はじめかた（3ステップ）</h2>
    <ol class="steps">
      <li>
        <strong>アプリパスワードを発行する</strong>
        <span>安全のため、普段のパスワードではなく、Bluesky の<a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer">設定画面</a>から専用のパスワードを作成してください。</span>
      </li>
      <li>
        <strong>ログインする</strong>
        <span>作成したパスワードと、あなたのハンドル（例: <code>shino3.bsky.social</code>）を入力してログインします。</span>
      </li>
      <li>
        <strong>投稿先を選んで Lift Off!</strong>
        <span>あとは投稿先のアカウントを選んでポストするだけ。複数のアカウントへ同時に投稿することもできます。</span>
      </li>
    </ol>
    <div class="quick-start-cta">
      <a href="/login" class="btn btn-primary">ログイン画面へ進む</a>
    </div>
  </section>

  <section class="info-section">
    <h2>便利な機能</h2>

    <h3>複数アカウントへの同時投稿</h3>
    <p>
      「アカウント」画面から複数のアカウントを登録できます。投稿時にチェックを入れるだけで、選んだアカウントすべてに同じ内容をポストできます。
    </p>

    <h3>画像の自動リサイズ</h3>
    <p>
      画像は最大4枚まで添付できます。Bluesky の制限（1MB / 2000px）に合わせて自動的にサイズを調整・圧縮するので、容量を気にせずアップロードできます。
    </p>

    <h3>リッチテキスト対応</h3>
    <ul>
      <li><code>@</code> から始めると、ユーザーへのメンションができます</li>
      <li>URL を入力すると、自動的にリンクカードが作成されます</li>
      <li><code>#</code> から始めると、ハッシュタグとして認識されます</li>
    </ul>

    <h3>ハッシュタグ履歴・テンプレート</h3>
    <p>
      過去に使ったハッシュタグは投稿欄の下に記憶され、ワンタップで入力できます。<br />
      また、よく使う挨拶や定型文は「テンプレート」として保存しておくことで、いつでもすぐに呼び出せます。
    </p>

    <h3>通知のまとめ見</h3>
    <p>
      登録しているすべてのアカウントの通知を、ひとつの画面でまとめて確認できます。リプライや「いいね」などで絞り込むことも可能です。
    </p>
  </section>

  <section class="info-section">
    <h2>スマホや他アプリからの共有</h2>
    <p>
      ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選ぶと、スマートフォンのアプリのように使うことができます。
    </p>
    <ul>
      <li><strong>Android や PC（Chrome / Edge）：</strong> OS の共有メニューから「Mass Driver」を選んで、見ているページの URL やテキストを直接投稿画面に送ることができます。</li>
      <li><strong>iOS（Safari）：</strong> 共有メニューからの直接送信には対応していませんが、代わりに「シェア URL」機能（<code>?intent=</code> を付けたリンク）を利用することで、ブログの共有ボタンなどから投稿画面を開くことができます。</li>
    </ul>
  </section>

  <section class="info-section">
    <h2>安心してお使いいただくために</h2>
    <p>
      パスワードなどのログイン情報や、保存したテンプレートは、すべて<strong>お使いの端末（ブラウザの中）</strong>にのみ保存されます。<br />
      Mass Driver のサーバーにあなたのデータが送られることはないため、安心してお使いいただけます。<br />
      <small>※ブラウザの履歴やデータを消去すると、自動的にログアウトされます。</small>
    </p>
  </section>

  <div class="cta">
    <a href="/" class="btn btn-primary">投稿画面へ</a>
    <p class="cta-note">未ログインの場合はログイン画面に移動します</p>
  </div>
</div>

<style>
  .info-wrapper {
    max-width: 540px;
    margin: 0 auto;
  }
  .brand-center {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 0 8px;
  }
  .brand-center h1 {
    font-size: var(--font-xl);
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .quick-start {
    margin-top: 20px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--panel-soft);
  }
  .quick-start h2 {
    font-size: var(--font-lg);
    font-weight: 700;
    margin: 0 0 12px;
    color: var(--text);
  }
  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  .steps li {
    counter-increment: step;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 0 10px 36px;
    position: relative;
    border-top: 1px solid var(--border);
  }
  .steps li:first-child {
    border-top: none;
    padding-top: 0;
  }
  .steps li::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 10px;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: white;
    font-size: var(--font-xs);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .steps li:first-child::before {
    top: 0;
  }
  .steps li strong {
    font-size: var(--font-base);
    color: var(--text);
  }
  .steps li span {
    font-size: var(--font-sm);
    color: var(--muted);
    line-height: 1.5;
  }
  .steps li a {
    color: var(--primary);
    text-decoration: none;
  }
  .steps li a:hover {
    text-decoration: underline;
  }
  .quick-start-cta {
    margin-top: 14px;
    text-align: center;
  }

  .info-section {
    margin-top: 24px;
  }
  .info-section h2 {
    font-size: var(--font-lg);
    font-weight: 700;
    margin: 0 0 10px;
    color: var(--text);
  }
  .info-section h3 {
    font-size: var(--font-base);
    font-weight: 600;
    margin: 16px 0 4px;
    color: var(--text);
  }
  .info-section h3:first-of-type {
    margin-top: 0;
  }
  .info-section p {
    font-size: var(--font-base);
    color: var(--muted);
    line-height: 1.7;
    margin-top: 8px;
  }
  .info-section ul {
    margin-top: 8px;
    padding-left: 0;
    list-style: none;
  }
  .info-section li {
    font-size: var(--font-sm);
    color: var(--muted);
    padding: 2px 0;
  }
  .info-section li::before {
    content: "–  ";
    color: var(--primary);
  }
  .cta {
    margin-top: 32px;
    text-align: center;
  }
  .cta-note {
    margin-top: 8px;
    font-size: var(--font-xs);
    color: var(--muted);
  }
</style>
