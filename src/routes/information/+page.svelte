<div class="info-wrapper">
  <div class="brand-center">
    <img src="/massdriver-icon.svg" alt="Mass Driver" width="30" height="30" />
    <h1>Information</h1>
  </div>

  <section class="info-section">
    <h2>What's This?</h2>
    <p>
      これは、Blueskyに投稿する専用のクライアントです。<br />
      Mass Driverとよび、その名の通りあなたの投稿を大空へ向けて打ち上げます。
    </p>
    <p>
      This is a dedicated client that posts to Bluesky.<br />
      It's called Mass Driver, and as the name suggests, it launches your post into the sky.
    </p>
  </section>

  <section class="info-section">
    <h2>How To Use?</h2>
    <p>
      ログインします。ハンドルネームはフル(shino3.bsky.socialの形式)で入力してください。<br />
      投稿したい内容を書いて、Lift Off! ボタンを押すと投稿されます。
    </p>
    <p>
      Log in. Please enter the full handle name (in the form of shino3.bsky.social).<br />
      Write what you want to post and press the Lift Off! button to post.
    </p>
    <ul>
      <li>@mention で入力するとメンションになります</li>
      <li>URLを入力すると、URLリンクを挿入できます</li>
      <li>#hashtag を本文に入力するとハッシュタグになります</li>
    </ul>
  </section>

  <section class="info-section">
    <h2>Share Target (PWA)</h2>
    <p>
      Mass Driver をインストールすると、OS の共有メニューから直接テキストや URL を送れるようになります。<br />
      共有された内容は投稿画面に自動で入力されます。
    </p>
    <ul>
      <li>Android Chrome / Desktop Chrome・Edge：共有メニューに「Mass Driver」が表示されます</li>
      <li>iOS Safari：Share Target には未対応です。下記の URL クエリをご利用ください</li>
    </ul>
    <p>
      <strong>インストール方法：</strong>ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択してください。
    </p>
  </section>

  <section class="info-section">
    <h2>Tips</h2>
    <p>
      URLクエリパラメータに対応しています。最初からメッセージを入れた状態で、投稿画面を表示できます。<br />
      ブログ等のシェアボタンに使用できます。
    </p>
    <div class="code-block">
      例：https://mdrv.shino3.net/?intent=Use+massdriver%21+share+it%21%0D%0Ahttps%3A%2F%2Fmdrv.shino3.net%0D%0A%40shino4.bsky.social
    </div>
    <p>
      iOS など Share Target 非対応の環境では、この URL クエリ形式がフォールバック手段になります。<br />
      ブログやサイトのシェアリンクに <code>?intent=</code> パラメータ付き URL を埋め込んでご利用ください。
    </p>
  </section>

  <div class="cta">
    <a href="/" class="btn btn-primary">Use It !</a>
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
  .info-section {
    margin-top: 24px;
  }
  .info-section h2 {
    font-size: var(--font-lg);
    font-weight: 700;
    margin: 0 0 10px;
    color: var(--text);
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
  .code-block {
    margin-top: 8px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--panel-soft);
    font-size: var(--font-sm);
    color: var(--muted);
    word-break: break-all;
    line-height: 1.5;
  }
  .cta {
    margin-top: 32px;
    text-align: center;
  }
</style>
