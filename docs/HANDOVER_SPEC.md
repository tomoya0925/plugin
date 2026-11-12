# Venture Platform システム仕様書・引継ぎ手順

最終更新日: 2026-11-12

対象リポジトリ: `https://github.com/tomoya0925/plugin`

本番環境: Cloudflare Workers + Static Assets + D1

## 1. 文書の目的

本書は、店舗内で運用するVenture Platformについて、現在の機能、構成、
データ、公開方法、日常運用、障害対応および後任者へのアカウント移管方法を
まとめたものである。

後任者は、最初に以下を確認すること。

1. GitHubリポジトリへアクセスできること
2. Cloudflareの対象アカウントへアクセスできること
3. 本番3画面が開けること
4. `APP_ACCESS_CODE`と`JOB_INFO_ADMIN_KEY`の管理方法を引き継いでいること
5. D1のバックアップを取得してから大きな変更を行うこと

## 2. サービス概要

店舗の来店者がスマートフォンからチェックインし、座席番号と「今日頑張ること」を
登録する。店舗モニターでは座席マップ上から来店者の活動内容を確認できる。

現在のサービスには、以下の3画面がある。

| 画面 | URL | 主な利用者 |
| --- | --- | --- |
| お客さん用 | `https://venture-platform.venture-platform-worker.workers.dev/` | 来店者 |
| 店舗モニター | `https://venture-platform.venture-platform-worker.workers.dev/?view=store-monitor` | 店内サイネージ |
| 店舗タブレット | `https://venture-platform.venture-platform-worker.workers.dev/?view=store-tablet` | 店舗スタッフ |

旧Vercel URLと旧Render APIは本番構成では使用しない。

## 3. システム構成

```text
来店者スマートフォン ─┐
店舗モニター          ├─ HTTPS ─ Cloudflare Worker ─ Cloudflare D1
店舗タブレット        ┘              │
                              React静的ファイル
```

### 3.1 フロントエンド

- React 19
- Vite 8
- Tailwind CSS 3
- Cloudflare Worker Static Assetsから配信
- 主な実装: `frontend/src/App.jsx`
- APIと画面は同一ドメインで配信

### 3.2 API

- Cloudflare Workers
- 依存フレームワークなしのJavaScript実装
- 主な実装: `cloudflare/src/index.js`
- 設定: `cloudflare/wrangler.toml`

### 3.3 データベース

- Cloudflare D1
- データベース名: `venture-platform-db`
- Worker Binding: `DB`
- マイグレーション: `cloudflare/migrations/0001_initial.sql`
- リージョン: APAC

### 3.4 GitHub

- リポジトリ: `tomoya0925/plugin`
- 本番基準ブランチ: `main`
- 現在の本番公開はWrangler CLIによる直接デプロイ
- GitHubへpushしただけでは本番が自動更新されるとは限らない

## 4. 機能仕様

### 4.1 お客さん用画面

#### 利用者名

- 最初にニックネームを入力する
- ニックネームはブラウザの`localStorage`へ保存する
- 本人確認やアカウント認証は行っていない

#### 今日頑張ること

- アバター、座席番号、今日頑張ることを登録できる
- 1件のチェックインとしてD1へ保存する
- チェックアウトすると`is_active`が`0`になる
- 過去レコードは削除せず、非アクティブ状態で残る

#### リアクション

- `like`または`talk`を送信できる
- 送信者ニックネームを保存する

#### コメント

- 今日頑張ることへコメントを送信できる
- 本文は最大300文字

#### 中長期

- ニックネームごとに1件掲載できる
- 項目は「今頑張っていること」「ほしいつながり」「プロフィール」
- 再入力で更新、消去で削除できる
- 一覧をクリックするとプロフィール詳細を表示する
- 閲覧、登録、更新、削除には共有パスコードが必要

#### 就活情報

- 1人が複数企業を登録できる
- 項目は企業名、職種、本選考・インターン、開始・終了時期、選考の特徴、企業の特徴
- 投稿者本人、または店舗管理キーを持つスタッフが削除できる
- 閲覧と投稿には共有パスコードが必要

### 4.2 店舗モニター

- `01`から`38`までの座席を表示する
- チェックイン中の席を強調表示する
- 座席を選択すると、ニックネームと今日頑張ることを右上に表示する
- 誰も手動選択していない場合、チェックイン中の利用者を10秒ごとにランダム表示する
- 10秒の表示切替は端末内だけで行い、API通信は発生しない
- 手動で座席を選択した後は「自動表示に戻す」でランダム表示へ戻る
- コミュニケーター入力欄とCanvaリンクは設置しない

### 4.3 店舗タブレット

- 中長期情報を一覧、検索、詳細表示できる
- 就活情報を一覧、企業名検索、詳細表示できる
- 就活情報を店舗管理キーで削除できる
- 座席マップは表示しない

## 5. データ更新と通信制御

店舗モニターはチェックイン情報を以下の間隔で確認する。

- 初回または変更検出後: 30秒後
- 変更なし: 60秒後
- 通信失敗時: 60秒後に再試行

チェックイン情報には`ETag`を使用する。

1. `app_metadata.checkins_version`をETagとして返す
2. フロントは次回リクエストで`If-None-Match`を送信する
3. 変更がなければAPIは`304 Not Modified`を返す
4. レスポンス本文とReactの状態更新を省略する
5. チェックイン、退出、リアクション、コメントの変更時にversionを加算する

## 6. 自動処理

Cloudflare Cron Triggerにより、毎日21:00（日本時間）に全アクティブチェックインを
非アクティブへ変更する。

```toml
[triggers]
crons = ["0 12 * * *"]
```

時刻はUTCで指定する。日本時間21:00はUTC 12:00である。

## 7. API一覧

末尾のスラッシュはWorker側で正規化される。

| Method | Path | 認証 | 用途 |
| --- | --- | --- | --- |
| GET | `/health` | なし | Worker・D1ヘルスチェック |
| GET | `/checkins/` | なし | アクティブチェックイン一覧 |
| POST | `/checkins/` | なし | チェックイン登録 |
| DELETE | `/checkins/{id}` | なし | チェックアウト |
| POST | `/checkins/{id}/reactions/` | なし | リアクション登録 |
| POST | `/checkins/{id}/comments/` | なし | コメント登録 |
| POST | `/checkins/reset-all/` | 管理キー | 全員チェックアウト |
| GET | `/long-term-profiles/` | 共有パスコード | 中長期一覧 |
| GET | `/long-term-profiles/{nickname}` | 共有パスコード | 中長期詳細 |
| POST | `/long-term-profiles/` | 共有パスコード | 中長期登録・更新 |
| DELETE | `/long-term-profiles/{nickname}` | 共有パスコード | 中長期削除 |
| GET | `/job-infos/` | 共有パスコード | 就活情報一覧 |
| POST | `/job-infos/` | 共有パスコード | 就活情報登録 |
| DELETE | `/job-infos/{id}` | 共有パスコード＋条件 | 就活情報削除 |

認証ヘッダー:

- 共有パスコード: `x-access-code`
- 店舗管理キー: `x-admin-key`

## 8. D1データ構造

### 8.1 `checkins`

| 列 | 内容 |
| --- | --- |
| `checkin_id` | 主キー |
| `user_id` | 現状は原則`1` |
| `nickname` | 表示名 |
| `avatar_id` | アバター種別 |
| `seat_number` | 座席番号 |
| `task_description` | 今日頑張ること、最大40文字 |
| `is_active` | 来店中は`1`、退出後は`0` |
| `created_at` | 登録日時、UTC |

### 8.2 `reactions`

- `checkin_id`でチェックインへ紐付く
- `reaction_type`は`like`または`talk`
- チェックインを物理削除した場合は連動削除される

### 8.3 `comments`

- `checkin_id`でチェックインへ紐付く
- `body`は最大300文字
- チェックインを物理削除した場合は連動削除される

### 8.4 `long_term_profiles`

- `nickname`は一意
- `current_focus`と`desired_connections`は最大120文字
- `profile_text`は最大800文字
- 明示的に削除されるまで掲載を継続する

### 8.5 `job_infos`

- 1人が複数レコードを登録可能
- `selection_type`は`本選考`または`インターン`
- 明示的に削除されるまで掲載を継続する

### 8.6 `app_metadata`

- `checkins_version`でチェックイン一覧の更新番号を管理する

### 8.7 索引

以下の検索へ索引を設定している。

- アクティブチェックインの日付、座席、ニックネーム
- リアクション・コメントのチェックインIDと日付
- 中長期情報の更新日時
- 就活情報の作成日時、企業名、投稿者

## 9. 秘密情報とセキュリティ

### 9.1 Cloudflare Secrets

| Secret | 用途 |
| --- | --- |
| `APP_ACCESS_CODE` | 中長期・就活情報の共有パスコード |
| `JOB_INFO_ADMIN_KEY` | 店舗管理操作、全員退出、就活情報削除 |

Secretの実値は、GitHub、仕様書、チャットの共有資料へ記載しない。

確認・再登録は以下で行う。

```powershell
cd cloudflare
npx wrangler secret list
npx wrangler secret put APP_ACCESS_CODE
npx wrangler secret put JOB_INFO_ADMIN_KEY
```

CloudflareはSecretの現在値を再表示しない。値が不明な場合は新しい値へ更新する。

### 9.2 現在の制約

本システムはお試し運用向けの簡易認証であり、以下を理解して運用する。

- ニックネームは本人確認にならない
- 就活情報の本人削除判定はニックネーム一致を使用する
- チェックイン、退出、リアクション、コメントAPIには認証がない
- 共有パスコードと管理キーは各端末の`localStorage`へ保存される
- 管理キーを共有端末へ入力した場合、その端末を第三者へ渡す前にブラウザデータを消去する
- 本格運用へ拡大する場合は個別ログインと権限管理の導入を検討する

### 9.3 外部サービス

アバター画像はDiceBearの外部URLから取得する。DiceBear側の障害や仕様変更時は
アバターが表示されない可能性がある。

## 10. 日常運用

### 開店時

1. お客さん用画面をスマートフォンで開けるか確認
2. 店舗モニターURLを開き、ヘッダーと38席が表示されるか確認
3. テストチェックインを1件行い、30秒以内または次回更新時にモニターへ反映されるか確認
4. テストチェックインを退出する

### 閉店時

- 原則として21:00の自動退出を利用する
- 必要な場合のみ管理キーを用いて`/checkins/reset-all/`を実行する
- 店舗モニターを再読み込みし、活動中人数を確認する

### 月1回

- CloudflareのWorkers・D1使用量を確認
- D1バックアップをエクスポート
- GitHubの依存関係やセキュリティ通知を確認
- 後任候補がCloudflareとGitHubへログインできるか確認

## 11. 費用と無料枠

現在はCloudflare無料枠で運用する想定である。

- Workers: 100,000リクエスト/日
- D1読み取り: 5,000,000行/日
- D1書き込み: 100,000行/日
- D1保存容量: 合計5GB、無料プランでは1DBあたり500MB

無料枠を超えた場合、自動的に従量課金へ移るのではなく、無料プランでは処理が
エラーになり、上限リセットまで停止する。Cloudflareのプランを有料へ変更する場合は、
変更前に請求先、予算通知および利用上限を確認する。

## 12. バックアップと復旧

### 12.1 D1 Time Travel

Cloudflare D1無料プランでは、原則として過去7日間のTime Travelを利用できる。
7日を超える保存のため、定期エクスポートも行う。

### 12.2 エクスポート

```powershell
cd cloudflare
npx wrangler d1 export venture-platform-db --remote --output backup.sql
```

`backup.sql`には利用者情報が含まれるため、公開リポジトリへcommitしない。
暗号化された保管場所へ保存する。

### 12.3 復旧前の注意

- 復旧操作前に現在のDBもエクスポートする
- 本番画面を一時的に利用停止できる時間帯に行う
- 復旧後に件数、チェックイン、コメント、削除を確認する

## 13. 開発と本番公開

### 13.1 必要環境

- Node.js
- npm
- Cloudflareアカウント
- Wrangler CLI（`cloudflare/package.json`から導入）
- Git

### 13.2 ローカル起動

```powershell
cd cloudflare
npm install
npm run db:migrate:local
npm run dev
```

別のターミナルで:

```powershell
cd frontend
npm install
npm run dev
```

`frontend/.env.local`:

```text
VITE_API_BASE_URL=http://localhost:8787
```

### 13.3 テスト

```powershell
cd frontend
npm run lint
npm run build

cd ..\cloudflare
node --check src/index.js
npm run db:migrate:local
```

### 13.4 本番公開

```powershell
cd frontend
npm run build

cd ..\cloudflare
npm run db:migrate:remote
npm run deploy
```

公開後に以下を確認する。

1. `/health`が`{"status":"ok"}`を返す
2. お客さん用画面が開く
3. 店舗モニターに38席が表示される
4. 店舗タブレットで中長期と就活情報を表示できる
5. チェックイン、コメント、退出が動作する
6. 変更なしのチェックイン取得が`304`になる
7. テストデータを削除する

## 14. 後任者への引継ぎ

### 14.1 推奨方式: 既存アカウントへ後任者を追加

サービスURLを変えずに引き継げるため、可能であればこの方式を使う。

1. GitHubリポジトリへ後任者をCollaboratorとして追加する
2. Cloudflareアカウントへ後任者をメンバーとして招待する
3. 後任者の端末でGitHubとCloudflareへログインする
4. 後任者が`wrangler whoami`、`wrangler d1 list`、`wrangler deployments list`を実行する
5. D1をエクスポートしてバックアップする
6. `APP_ACCESS_CODE`と`JOB_INFO_ADMIN_KEY`を新しい値へ変更する
7. お客さん、店舗モニター、店舗タブレットの動作を後任者と一緒に確認する
8. 問題がないことを確認してから前任者のアクセス権を外す

パスワードや二要素認証コードを後任者へ共有せず、必ず招待機能を使用する。

### 14.2 完全に別のCloudflareアカウントへ移す場合

Cloudflareリソースを別アカウントで作り直す場合は、次の順序を守る。

1. 旧D1をSQLへエクスポートする
2. GitHubリポジトリを後任者へ共有または所有権移管する
3. 後任アカウントでCloudflareへログインする
4. 新しいD1 `venture-platform-db`を作成する
5. `cloudflare/wrangler.toml`の`database_id`を新しいIDへ変更する
6. 新D1へマイグレーションを適用する
7. 旧DBのエクスポートデータを新D1へインポートする
8. 2つのSecretを新しい値で登録する
9. Workerをデプロイする
10. 新しい公開URLを`ALLOWED_ORIGINS`へ追加して再デプロイする
11. 3画面と自動退出を確認する
12. 店内QRコード、ブックマーク、サイネージURLを新URLへ交換する
13. 最低1週間は旧環境を削除せず、切り戻せる状態を残す
14. 新環境の安定を確認してから旧環境を停止する

新D1へのインポート例:

```powershell
npx wrangler d1 execute venture-platform-db --remote --file backup.sql
```

### 14.3 GitHubリポジトリの所有権を移す場合

- GitHubのTransfer ownership機能を使用する
- 移管後にローカルの`origin`を新URLへ変更する
- Cloudflareのデプロイ元をGitHub連携へ変更する場合は、新所有者のリポジトリを指定する
- 移管前にブランチ、Issue、Secret、Actionsの状態を確認する

## 15. 障害対応

### 画面が開かない

1. `https://venture-platform.venture-platform-worker.workers.dev/health`を確認
2. Cloudflare Dashboardで最新Deploymentを確認
3. GitHubの最新commitと本番Versionを確認
4. 必要に応じて直前のWorker Versionへロールバックする

### チェックインできない

1. `/health`を確認
2. D1 Metricsで読み取り・書き込み上限を確認
3. ブラウザの開発者ツールでAPIステータスを確認
4. 座席番号、今日頑張ることの文字数を確認

### 中長期・就活情報が表示されない

1. 共有パスコードを再入力する
2. ブラウザの`venture_access_code`を削除して再入力する
3. Cloudflare Secret `APP_ACCESS_CODE`が登録されているか確認する

### 店舗管理削除ができない

1. ブラウザの`venture_admin_key`を削除する
2. 正しい管理キーを再入力する
3. Cloudflare Secret `JOB_INFO_ADMIN_KEY`を再設定する

## 16. 引継ぎ完了チェックリスト

- [ ] 後任者がGitHubへログインできる
- [ ] 後任者がCloudflareへログインできる
- [ ] 二要素認証と復旧手段を後任者自身で設定した
- [ ] D1バックアップを取得した
- [ ] Secretを新しい値へ変更した
- [ ] お客さん用画面を確認した
- [ ] 店舗モニターを確認した
- [ ] 店舗タブレットを確認した
- [ ] チェックインと退出を確認した
- [ ] 21時の自動退出を確認した
- [ ] Cloudflareの契約プランと請求通知を確認した
- [ ] 店内QRコードとブックマークを確認した
- [ ] 前任者の権限を外した

## 17. 変更時の原則

- 本番変更前にD1をバックアップする
- Secretをソースコードへ書かない
- `main`へpushする前にlintとbuildを通す
- D1の変更はマイグレーションファイルとして追加する
- 本番公開後にテストデータを必ず削除する
- 無関係な機能を同時に変更しない
- URLを変更した場合は店内端末、QRコード、CORS、仕様書を同時に更新する
