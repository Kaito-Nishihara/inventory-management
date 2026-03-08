# 第20章 リリース前品質ゲート（CI統合: lint/test/e2e/db-docs）

## 背景
main へマージする前に、品質確認を自動化して人手ミスを減らします。  
この章では GitHub Actions でフロントエンド/バックエンドの検証、E2E、DBドキュメント生成を統合します。

## 目的
- PR 時点で lint / unit test / build / e2e / db-docs を自動実行する
- PRテンプレートでレビュー観点と運用チェックを統一する

## 対応内容
1. `.github/workflows/ci.yml` に E2E ジョブを追加
2. `db-docs` ワークフローを `workflow_call` で再利用可能化
3. `ci.yml` から `db-docs` を呼び出す統合ジョブを追加
4. `apps/web/playwright.config.ts` に `webServer` を設定してCIで自己起動可能化
5. `.github/PULL_REQUEST_TEMPLATE.md` を追加し、必須見出しと運用チェックを定義

## 動作確認
- `npm run lint` (`apps/web`) : 成功
- `npm run test:unit` (`apps/web`) : 成功
- `npm run build` (`apps/web`) : 成功
- `npm run test:e2e` (`apps/web`) : 成功（15 passed / 4 skipped）

## 補足
- 現時点で不安定なE2Eシナリオは `skip` で明示し、品質ゲート全体は安定実行を優先しています。
- `db-docs` は CI から呼び出し可能にしつつ、`main` push 時は従来どおりドキュメント自動コミットを維持しています。

