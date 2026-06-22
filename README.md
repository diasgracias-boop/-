# 医療機器管理システム

医療機器の台帳・点検・修理を一元管理するWebアプリ（Next.js + PostgreSQL）

## 機能

- **機器台帳**: 機器の登録・編集・削除・一覧表示・ステータス管理
- **点検スケジュール**: 定期点検の予定管理・自動次回スケジュール生成・期限アラート
- **保守履歴**: 点検・校正・清掃などの作業記録
- **修理・故障履歴**: 故障報告・対応状況の追跡・費用管理
- **ダッシュボード**: 全体状況の俯瞰（期限超過・未対応修理をハイライト）

## セットアップ

### 1. 必要なソフトウェア

- Node.js 18+
- Docker（PostgreSQL用）または既存のPostgreSQLサーバー

### 2. PostgreSQLを起動

```bash
docker-compose up -d
```

### 3. 環境変数を設定

`.env` ファイルを編集:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medical_devices"
NEXTAUTH_SECRET="本番環境では必ず変更してください"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. マイグレーションとシードデータ投入

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスしてログインしてください。

### 初期ユーザー

| ユーザー | メール | パスワード | 権限 |
|---------|--------|----------|------|
| 管理者 | admin@hospital.jp | admin1234 | ADMIN（機器削除可） |
| スタッフ | staff@hospital.jp | user1234 | USER |

## 院内デプロイ（複数PC対応）

院内の特定PCをサーバーとして指定し、他のPCからブラウザでアクセスする構成を推奨します。

```bash
# サーバーPCで本番ビルド起動
npm run build
npm start
```

`.env` の `NEXTAUTH_URL` をサーバーPCのIPアドレスに変更:

```
NEXTAUTH_URL="http://192.168.1.100:3000"
```

## 技術スタック

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- PostgreSQL + Prisma ORM
- NextAuth.js（認証・セッション管理）
