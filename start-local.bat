@echo off
chcp 65001 > nul
echo =====================================================
echo  医療機器管理システム - ローカル起動スクリプト
echo =====================================================
echo.

REM Bun がインストール済みか確認
where bun >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Bun がインストールされていません。
    echo.
    echo 以下のコマンドを PowerShell で実行してください:
    echo   powershell -c "irm bun.sh/install.ps1 | iex"
    echo.
    echo インストール後、新しいコマンドプロンプトを開いて再実行してください。
    pause
    exit /b 1
)

echo [OK] Bun: 検出済み
bun --version
echo.

REM .env.local が存在するか確認
if not exist ".env.local" (
    echo [ERROR] .env.local が見つかりません。
    echo.
    echo 1. .env.example を .env.local にコピーしてください
    echo 2. DATABASE_URL に Neon の接続文字列を入力してください
    echo.
    echo Neon 無料DB の作成方法:
    echo   1. https://neon.tech にアクセス
    echo   2. 無料アカウントを作成
    echo   3. New Project を作成
    echo   4. Connection string をコピー
    echo   5. .env.local の DATABASE_URL に貼り付け
    echo.
    pause
    exit /b 1
)

echo [OK] .env.local: 検出済み
echo.

REM node_modules がなければインストール
if not exist "node_modules" (
    echo [INFO] 依存パッケージをインストールしています...
    bun install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] bun install に失敗しました
        pause
        exit /b 1
    )
    echo [OK] インストール完了
    echo.
)

REM DBマイグレーション実行
echo [INFO] DBマイグレーションを実行しています...
bun run prisma migrate deploy
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] migrate deploy に失敗しました。続行します...
)
echo.

REM 管理者ユーザーが存在するか確認・作成
echo [INFO] 管理者ユーザーを確認しています...
bun run scripts/setup-admin.ts
echo.

echo =====================================================
echo  アプリを起動します
echo  ブラウザで http://localhost:3000 を開いてください
echo.
echo  ログイン情報:
echo    メール:     admin@hospital.jp
echo    パスワード: admin1234
echo.
echo  終了するには Ctrl+C を押してください
echo =====================================================
echo.

bun run dev
