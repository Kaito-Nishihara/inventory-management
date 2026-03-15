---
title: "Claude Code Action で PR 自動レビュー → /ai-fix で自動修正まで構築した話"
emoji: "🤖"
type: "tech"
topics: ["github", "githubactions", "claude", "ai", "codereview"]
published: false
---

## はじめに

個人開発の在庫管理システム（React + .NET + PostgreSQL）で、PR を出すたびに **Claude が自動でコードレビュー**してくれる仕組みを GitHub Actions で構築しました。

さらに、CI が失敗したときに**エラーログを自動分析して原因と修正方針をコメント**してくれるワークフローも追加。

この記事では、実装の全体像・ハマったポイント・実際のレビュー結果を紹介します。

## 全体像

構築したのは以下の 2 つのワークフローです。

| ワークフロー | トリガー | やること |
|---|---|---|
| **Claude PR Review** | PR の open / push | 差分＋受け入れ条件を収集 → Claude がレビュー → PR にコメント |
| **CI Failure Analysis** | CI ワークフロー失敗時 | 失敗ログを収集 → Claude が原因分析 → PR にコメント |

どちらも **Claude Code の Pro プラン（$20/月）の OAuth トークン** を使っており、追加の API 課金は発生しません。

### アーキテクチャ

```
PR open/push
    │
    ▼
┌─────────────────────────────┐
│  Step 1: シェルで情報収集     │
│  - gh pr diff (差分)         │
│  - gh issue view (受入条件)   │
│  - GraphQL (リンク Issue)    │
└──────────┬──────────────────┘
           │ GITHUB_OUTPUT
           ▼
┌─────────────────────────────┐
│  Step 2: Claude で分析       │
│  claude-code-action@v1      │
│  (ツール使用禁止で純粋分析)    │
└──────────┬──────────────────┘
           │ claude-execution-output.json
           ▼
┌─────────────────────────────┐
│  Step 3: PR にコメント投稿    │
│  Python で結果抽出            │
│  → gh pr comment             │
└─────────────────────────────┘
```

## 実装

### 1. Claude PR Review ワークフロー

#### Secret の設定

Claude Code の OAuth トークンを GitHub リポジトリの Secrets に登録します。

```
Settings → Secrets and variables → Actions → New repository secret
Name: CLAUDE_CODE_OAUTH_TOKEN
Value: (Claude Code の OAuth トークン)
```

OAuth トークンは Claude Code CLI で `claude` コマンドを使っている場合、Pro プランの利用枠内で使えます。

#### ワークフロー全文

```yaml:.github/workflows/claude-review.yml
name: Claude PR Review

on:
  pull_request:
    types: [opened, ready_for_review, synchronize]

concurrency:
  group: claude-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  review:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: PR 差分と受け入れ条件を収集
        id: collect
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PR_NUMBER=${{ github.event.pull_request.number }}

          # 変更ファイル一覧
          FILES=$(gh pr diff "${PR_NUMBER}" --name-only)
          {
            echo "changed_files<<GHEOF"
            echo "$FILES"
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

          # 差分（最大500行）
          DIFF=$(gh pr diff "${PR_NUMBER}" | head -500)
          {
            echo "diff<<GHEOF"
            echo "$DIFF"
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

          # 関連 Issue の受け入れ条件を収集
          PR_BODY=$(gh pr view "${PR_NUMBER}" --json body --jq '.body')
          ISSUE_NUMBERS=$(echo "$PR_BODY" | grep -oP '#\d+' | grep -oP '\d+' | sort -u || true)

          ACCEPTANCE_CRITERIA=""
          for ISSUE_NUM in $ISSUE_NUMBERS; do
            ISSUE_BODY=$(gh issue view "$ISSUE_NUM" --json body --jq '.body' 2>/dev/null || true)
            if [ -n "$ISSUE_BODY" ]; then
              ACCEPTANCE_CRITERIA="${ACCEPTANCE_CRITERIA}
          --- Issue #${ISSUE_NUM} ---
          ${ISSUE_BODY}
          "
            fi
          done

          # closes/fixes でリンクされた Issue も GraphQL で取得
          LINKED_ISSUES=$(gh api graphql -f query='
            query {
              repository(owner: "${{ github.repository_owner }}", name: "${{ github.event.repository.name }}") {
                pullRequest(number: '"$PR_NUMBER"') {
                  closingIssuesReferences(first: 10) {
                    nodes { number body }
                  }
                }
              }
            }' --jq '.data.repository.pullRequest.closingIssuesReferences.nodes[]? | "--- Issue #\(.number) ---\n\(.body)"' 2>/dev/null || true)

          if [ -n "$LINKED_ISSUES" ]; then
            ACCEPTANCE_CRITERIA="${ACCEPTANCE_CRITERIA}
          ${LINKED_ISSUES}"
          fi

          if [ -z "$ACCEPTANCE_CRITERIA" ]; then
            ACCEPTANCE_CRITERIA="（関連 Issue の受け入れ条件が見つかりませんでした）"
          fi

          {
            echo "criteria<<GHEOF"
            echo "$ACCEPTANCE_CRITERIA" | head -200
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

      - name: Claude でレビュー
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            あなたは10年以上の経験を持つシニアソフトウェアエンジニアです。
            React + TypeScript フロントエンドと .NET バックエンドのマイクロサービス構成に精通しています。
            以下の PR を厳密にレビューしてください。
            ツールは使わないでください。この情報だけで分析してそのまま回答してください。

            ## レビュー対象
            - PR: #${{ github.event.pull_request.number }}
            - タイトル: ${{ github.event.pull_request.title }}
            - ブランチ: ${{ github.event.pull_request.head.ref }} → ${{ github.event.pull_request.base.ref }}

            ## PR 本文
            ${{ github.event.pull_request.body }}

            ## 変更ファイル一覧
            ${{ steps.collect.outputs.changed_files }}

            ## 差分（先頭500行）
            ```diff
            ${{ steps.collect.outputs.diff }}
            ```

            ## 関連 Issue の受け入れ条件
            ${{ steps.collect.outputs.criteria }}

            ## レビュー指示

            以下の観点で **差分と受け入れ条件に基づいて** レビューしてください。
            推測ではなく、提供されたコードの実際の差分から判断してください。

            ### 1. 受け入れ条件チェック
            関連 Issue の受け入れ条件それぞれについて:
            - ✅ 実装済み: 差分で確認できたもの
            - ⚠️ 未確認: 差分からは判断できないもの
            - ❌ 未実装: 明らかに不足しているもの

            ### 2. コード品質
            - null/undefined ガード不足
            - エラーハンドリングの漏れ
            - セキュリティリスク（認可チェック漏れ、SQL/コマンドインジェクション、XSS 等）
            - 型安全性の問題（any の使用、型アサーションの乱用）
            - 競合状態やメモリリークの可能性

            ### 3. テストカバレッジ
            - 変更に対応するテストがあるか
            - 不足しているテスト観点
            - エッジケースのカバー状況（境界値、空配列、null）
            - 非同期処理のテスト（タイミング依存、Promise の rejection）

            ### 4. 危険な変更
            - 破壊的変更の有無（API シグネチャ変更、型定義変更）
            - DB スキーマ変更の影響
            - 認証・認可ロジックの変更
            - 共有コンポーネントへの影響

            ### 5. リスク判定
            変更全体のリスクを判定してください:
            - 🟢 低リスク: 軽微な修正、テスト追加、リファクタリング
            - 🟡 中リスク: 機能追加、既存ロジック変更
            - 🔴 高リスク: 認証・認可変更、DB スキーマ変更、破壊的変更

            ---
            以下のフォーマットで回答してください。
            軽微な指摘（フォーマット、命名の好み、コメント不足）は省略し、実質的な問題のみ指摘してください。

            ## 🤖 AI レビュー

            ### 受け入れ条件チェック
            | 条件 | 状態 | 備考 |
            |------|------|------|
            | 条件の内容 | ✅/⚠️/❌ | 詳細 |

            ### コード品質
            - 指摘事項があれば箇条書き（問題なければ「特に指摘なし」）

            ### テストカバレッジ
            - 不足テスト観点があれば箇条書き

            ### 危険な変更
            - 該当があれば箇条書き（なければ「特になし」）

            ### リスク判定: 🟢/🟡/🔴
            理由を1〜2文で

            ### 総合コメント
            全体の所感を2〜3文で

      - name: PR にレビューコメントを投稿
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PR_NUMBER=${{ github.event.pull_request.number }}

          REVIEW=""
          OUTPUT_FILE="/home/runner/work/_temp/claude-execution-output.json"
          if [ -f "$OUTPUT_FILE" ]; then
            REVIEW=$(python3 -c "
          import json, sys
          with open('$OUTPUT_FILE') as f:
              data = json.load(f)
          if isinstance(data, list):
              for msg in reversed(data):
                  if msg.get('type') == 'result' and msg.get('result'):
                      print(msg['result'])
                      sys.exit(0)
          elif isinstance(data, dict):
              if data.get('result'):
                  print(data['result'])
          " 2>/dev/null || true)
          fi

          if [ -z "$REVIEW" ]; then
            REVIEW="## 🤖 AI レビュー

          レビューを実行しましたが、結果の取得に失敗しました。"
          fi

          # 既存コメントがあれば更新、なければ新規作成
          EXISTING_COMMENT_ID=$(gh api "repos/${{ github.repository }}/issues/${PR_NUMBER}/comments" \
            --jq '[.[] | select(.body | startswith("## 🤖 AI レビュー")) | .id] | last // empty')

          if [ -n "$EXISTING_COMMENT_ID" ]; then
            gh api "repos/${{ github.repository }}/issues/comments/${EXISTING_COMMENT_ID}" \
              -X PATCH \
              -f body="${REVIEW}"
          else
            gh pr comment "${PR_NUMBER}" --body "${REVIEW}"
          fi
```

### 2. CI 失敗分析ワークフロー

CI が失敗したときに自動で原因を分析してくれるワークフローです。

```yaml:.github/workflows/ci-failure-analysis.yml
name: CI Failure Analysis

on:
  workflow_run:
    workflows: ["ci"]
    types: [completed]

jobs:
  analyze-failure:
    if: >
      github.event.workflow_run.conclusion == 'failure' &&
      github.event.workflow_run.event == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
      actions: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      - name: CI 失敗ログを収集
        id: collect
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          RUN_ID=${{ github.event.workflow_run.id }}

          PR_NUMBER=$(gh api "repos/${{ github.repository }}/actions/runs/${RUN_ID}" \
            --jq '.pull_requests[0].number // empty')

          if [ -z "$PR_NUMBER" ]; then
            echo "skip=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          # 失敗したジョブとステップを取得
          FAILED_JOBS=$(gh api "repos/${{ github.repository }}/actions/runs/${RUN_ID}/jobs" \
            --jq '[.jobs[] | select(.conclusion == "failure") | {name, steps: [.steps[] | select(.conclusion == "failure") | .name]}]')

          # ログをダウンロードしてエラー箇所を抽出
          ERROR_LOG="(ログ取得失敗)"
          gh api "repos/${{ github.repository }}/actions/runs/${RUN_ID}/logs" > /tmp/logs.zip 2>/dev/null || true
          if [ -f /tmp/logs.zip ] && [ -s /tmp/logs.zip ]; then
            mkdir -p /tmp/ci-logs
            unzip -o /tmp/logs.zip -d /tmp/ci-logs 2>/dev/null || true
            ERROR_LOG=$(find /tmp/ci-logs -name "*.txt" -exec grep -l -i "error\|fail\|assert" {} \; \
              | head -5 | xargs -I{} tail -50 {} 2>/dev/null | head -200)
          fi

          echo "pr_number=${PR_NUMBER}" >> "$GITHUB_OUTPUT"
          echo "run_id=${RUN_ID}" >> "$GITHUB_OUTPUT"
          echo "skip=false" >> "$GITHUB_OUTPUT"

          {
            echo "failed_jobs<<GHEOF"
            echo "${FAILED_JOBS}"
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

          {
            echo "error_log<<GHEOF"
            echo "${ERROR_LOG}" | head -150
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

      - name: Claude で分析
        if: steps.collect.outputs.skip != 'true'
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          prompt: |
            以下の CI 失敗ログを分析してください。
            ツールは使わないでください。この情報だけで分析してそのまま回答してください。

            CI Run: https://github.com/${{ github.repository }}/actions/runs/${{ steps.collect.outputs.run_id }}
            PR: #${{ steps.collect.outputs.pr_number }}

            === 失敗ジョブ ===
            ${{ steps.collect.outputs.failed_jobs }}

            === エラーログ（抜粋） ===
            ${{ steps.collect.outputs.error_log }}

            ---
            以下のフォーマットで回答してください:

            ## 🔍 CI 失敗分析

            **CI Run**: [Run #ID](URL)

            ### 失敗したジョブ
            - ジョブ名 > ステップ名

            ### 失敗分類
            `lint` / `unit-test` / `build` / `e2e` / `infrastructure` のいずれか

            ### エラー概要
            エラーメッセージの要約（5行以内）

            ### 原因候補
            1. 最も可能性の高い原因
            2. 次に可能性の高い原因

            ### 影響範囲
            このエラーが影響するファイルや機能

            ### 推奨アクション
            修正の方向性

      - name: PR にコメントを投稿
        if: steps.collect.outputs.skip != 'true'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PR_NUMBER=${{ steps.collect.outputs.pr_number }}
          RUN_ID=${{ steps.collect.outputs.run_id }}

          ANALYSIS=""
          OUTPUT_FILE="/home/runner/work/_temp/claude-execution-output.json"
          if [ -f "$OUTPUT_FILE" ]; then
            ANALYSIS=$(python3 -c "
          import json, sys
          with open('$OUTPUT_FILE') as f:
              data = json.load(f)
          if isinstance(data, list):
              for msg in reversed(data):
                  if msg.get('type') == 'result' and msg.get('result'):
                      print(msg['result'])
                      sys.exit(0)
          elif isinstance(data, dict):
              if data.get('result'):
                  print(data['result'])
          " 2>/dev/null || true)
          fi

          if [ -z "$ANALYSIS" ]; then
            ANALYSIS="## 🔍 CI 失敗分析

          CI 失敗を検出しましたが、自動分析に失敗しました。"
          fi

          EXISTING_COMMENT_ID=$(gh api "repos/${{ github.repository }}/issues/${PR_NUMBER}/comments" \
            --jq '[.[] | select(.body | startswith("## 🔍 CI 失敗分析")) | .id] | last // empty')

          if [ -n "$EXISTING_COMMENT_ID" ]; then
            gh api "repos/${{ github.repository }}/issues/comments/${EXISTING_COMMENT_ID}" \
              -X PATCH \
              -f body="${ANALYSIS}"
          else
            gh pr comment "${PR_NUMBER}" --body "${ANALYSIS}"
          fi
```

## ハマったポイント

### 1. claude-code-action は PR コメントを自動投稿しない

`anthropics/claude-code-action@v1` を `pull_request` イベントで使うと、Claude は分析を実行しますが **結果を PR にコメントとして投稿する機能は持っていません**。

結果は `/home/runner/work/_temp/claude-execution-output.json` に JSON として書き出されるので、自分で抽出して `gh pr comment` で投稿する必要があります。

```bash
# Python で結果を抽出
REVIEW=$(python3 -c "
import json, sys
with open('/home/runner/work/_temp/claude-execution-output.json') as f:
    data = json.load(f)
if isinstance(data, list):
    for msg in reversed(data):
        if msg.get('type') == 'result' and msg.get('result'):
            print(msg['result'])
            sys.exit(0)
")

# PR にコメント
gh pr comment "${PR_NUMBER}" --body "${REVIEW}"
```

### 2. 「ツールは使わないでください」が必須

Claude Code Action はデフォルトでツール（ファイル読み取り、コマンド実行など）を使おうとします。しかし `pull_request` イベントでは権限が制限されているため、ツール呼び出しが `permission_denials_count` としてカウントされ、肝心の分析結果が空になることがあります。

プロンプトに **「ツールは使わないでください。この情報だけで分析してそのまま回答してください。」** と明記することで、差分をプロンプトに直接埋め込んだ情報だけで分析させます。

### 3. 同じコメントを更新する仕組み

push のたびに新しいコメントが増えると邪魔なので、既存のコメントを探して更新します。

```bash
# 「## 🤖 AI レビュー」で始まるコメントを検索
EXISTING_COMMENT_ID=$(gh api "repos/${REPO}/issues/${PR_NUMBER}/comments" \
  --jq '[.[] | select(.body | startswith("## 🤖 AI レビュー")) | .id] | last // empty')

if [ -n "$EXISTING_COMMENT_ID" ]; then
  # 既存コメントを更新
  gh api "repos/${REPO}/issues/comments/${EXISTING_COMMENT_ID}" \
    -X PATCH -f body="${REVIEW}"
else
  # 新規作成
  gh pr comment "${PR_NUMBER}" --body "${REVIEW}"
fi
```

### 4. 受け入れ条件の自動収集

PR 本文に `#123` のような Issue 参照があれば、その Issue の本文（受け入れ条件）を自動取得します。さらに `closes #123` / `fixes #123` で **リンクされた Issue** も GraphQL API で取得します。

```bash
# PR 本文から #番号 を抽出
ISSUE_NUMBERS=$(echo "$PR_BODY" | grep -oP '#\d+' | grep -oP '\d+' | sort -u)

# closes/fixes でリンクされた Issue は GraphQL で取得
LINKED_ISSUES=$(gh api graphql -f query='
  query {
    repository(owner: "OWNER", name: "REPO") {
      pullRequest(number: PR_NUM) {
        closingIssuesReferences(first: 10) {
          nodes { number body }
        }
      }
    }
  }' --jq '...')
```

これにより、レビューが「Issue の受け入れ条件を満たしているか」を自動でチェックできます。

### 5. concurrency で重複実行を防止

push のたびにワークフローが走るので、前の実行をキャンセルします。

```yaml
concurrency:
  group: claude-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

## レビュー結果の例

実際に投稿されたレビューコメントです。

```markdown
## 🤖 AI レビュー

### 受け入れ条件チェック
| 条件 | 状態 | 備考 |
|------|------|------|
| リフレッシュトークン排他制御 | ✅ | fetchWithAutoRefresh で実装済み |
| 401 時の自動再認証 | ✅ | 差分で確認 |
| E2E テスト追加 | ⚠️ | auth-refresh.spec.ts があるが網羅性は未確認 |

### コード品質
- `readApiErrorCode` の戻り値型が `string | null` → `string | undefined` に変更されているが、呼び出し元との整合性を確認すべき

### テストカバレッジ
- リフレッシュトークンの有効期限切れケースのテストが不足

### 危険な変更
- 認証フローの変更（fetchWithAutoRefresh の導入）

### リスク判定: 🟡
認証フローの変更を含むため中リスク。排他制御のロジックは適切に実装されている。

### 総合コメント
リフレッシュトークンの排他制御が適切に実装されており、並行リクエスト時の重複リフレッシュを防ぐ設計になっている。型の不一致（null vs undefined）は修正が必要。
```

## コスト

Claude Code の **Pro プラン（$20/月）** の OAuth トークンを使っているため、追加の API 課金は発生しません。Pro プランの利用枠内で動作します。

1 回のレビューで約 1 分程度で完了します。

## Phase 2: `/ai-fix` コマンドによる自動修正

Phase 1 のレビューで指摘された問題を、**PR にコメントするだけで自動修正**できる仕組みを追加しました。

### 使い方

PR に以下のようにコメントするだけです。

```
/ai-fix
```

特定の指摘だけ修正したい場合は、追加指示を付けられます。

```
/ai-fix null チェックだけ修正して
```

### アーキテクチャ

```
PR に "/ai-fix" とコメント
    │
    ▼
┌─────────────────────────────┐
│  Step 1: コンテキスト収集     │
│  - AI レビューコメント取得     │
│  - CI 失敗分析コメント取得     │
│  - ユーザーの追加指示を抽出    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Step 2: Claude で修正実行    │
│  claude-code-action@v1      │
│  (ツール使用有効)             │
│  - ファイル読み書き           │
│  - git commit & push        │
│  - テスト実行                │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Step 3: 修正レポート投稿     │
│  → 🔧 AI 自動修正レポート    │
└─────────────────────────────┘
```

Phase 1 との最大の違いは **Claude にツール使用を許可**している点です。Phase 1 では「ツールは使わないでください」と制限していましたが、Phase 2 では実際にコードを読み書きし、テストを実行し、コミット・プッシュまで行います。

### ワークフロー

```yaml:.github/workflows/claude-fix.yml
name: Claude AI Fix

on:
  issue_comment:
    types: [created]

concurrency:
  group: claude-fix-${{ github.event.issue.number }}
  cancel-in-progress: true

jobs:
  ai-fix:
    if: |
      github.event.issue.pull_request &&
      contains(github.event.comment.body, '/ai-fix')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - name: PR 情報を取得
        id: pr
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PR_NUMBER=${{ github.event.issue.number }}
          PR_DATA=$(gh api "repos/${{ github.repository }}/pulls/${PR_NUMBER}")
          HEAD_REF=$(echo "$PR_DATA" | jq -r '.head.ref')
          echo "head_ref=${HEAD_REF}" >> "$GITHUB_OUTPUT"
          echo "pr_number=${PR_NUMBER}" >> "$GITHUB_OUTPUT"

      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          ref: ${{ steps.pr.outputs.head_ref }}
          fetch-depth: 0

      - name: レビューコメントと CI 失敗情報を収集
        id: context
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PR_NUMBER=${{ steps.pr.outputs.pr_number }}

          # AI レビューコメントを取得
          REVIEW_COMMENT=$(gh api "repos/${{ github.repository }}/issues/${PR_NUMBER}/comments" \
            --jq '[.[] | select(.body | startswith("## 🤖 AI レビュー")) | .body] | last // ""')

          # CI 失敗分析コメントを取得
          CI_ANALYSIS=$(gh api "repos/${{ github.repository }}/issues/${PR_NUMBER}/comments" \
            --jq '[.[] | select(.body | startswith("## 🔍 CI 失敗分析")) | .body] | last // ""')

          {
            echo "review<<GHEOF"
            echo "$REVIEW_COMMENT" | head -200
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

          {
            echo "ci_analysis<<GHEOF"
            echo "$CI_ANALYSIS" | head -200
            echo "GHEOF"
          } >> "$GITHUB_OUTPUT"

      - name: Claude でコード修正を実行
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          trigger_phrase: "/ai-fix"
          claude_args: "--allowedTools Bash(git:*) Bash(dotnet:*) Bash(npm:*) --max-turns 30"
          prompt: |
            あなたは10年以上の経験を持つシニアソフトウェアエンジニアです。
            PR のレビュー指摘事項と CI 失敗を修正してください。
            コードを修正し、コミットしてプッシュしてください。

            ## AI レビューの指摘事項
            ${{ steps.context.outputs.review }}

            ## CI 失敗分析
            ${{ steps.context.outputs.ci_analysis }}

            ## 修正ルール
            1. 具体的指摘を修正する。不確実な修正は行わない
            2. 既存パターンに従い、大規模リファクタリングは避ける
            3. 可能ならテスト実行（dotnet test, npm run test:unit）で確認
            4. コミットメッセージは日本語で書く
            5. 修正後、🔧 AI 自動修正レポート を出力する

      - name: 修正レポートを PR にコメント
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          # ... (Phase 1 と同じパターンで結果を抽出・投稿)
```

### Phase 1 → Phase 2 の連携

Phase 1 のレビューコメント末尾に、自動的に `/ai-fix` のヒントが追加されます。

```markdown
### 総合コメント
リフレッシュトークンの排他制御が適切に実装されている。型の不一致は修正が必要。

---
💡 指摘を自動修正するには `/ai-fix` とコメントしてください。
特定の指摘のみ修正する場合は `/ai-fix null チェックだけ修正して` のように追加指示を書けます。
```

レビューを見て「これは自動で直せそうだな」と思ったら、すぐにコメントするだけ。Claude が指摘を読み取り、コード修正 → テスト → コミット → プッシュまで自動でやってくれます。

### Phase 2 のハマりポイント

#### `@claude` との競合回避

既存の `claude.yml` に `@claude` メンション対応のジョブがある場合、`/ai-fix` を含むコメントで両方のワークフローが発火する可能性があります。

`claude.yml` 側に除外条件を追加して解決しました。

```yaml
# claude.yml
if: |
  (github.event_name == 'issue_comment' &&
   contains(github.event.comment.body, '@claude') &&
   !contains(github.event.comment.body, '/ai-fix'))  # ← 追加
```

#### ツール権限の設計

Phase 1 では「ツール使用禁止」でしたが、Phase 2 では意図的にツールを許可します。ただし **必要なツールだけを許可** するのがポイントです。

```yaml
claude_args: "--allowedTools Bash(git:*) Bash(dotnet:*) Bash(npm:*) --max-turns 30"
```

- `Bash(git:*)` — コミット・プッシュに必要
- `Bash(dotnet:*)` — .NET テスト実行
- `Bash(npm:*)` — フロントテスト実行
- `--max-turns 30` — トークン消費の上限

#### セキュリティ

- `/ai-fix` は **リポジトリへの write 権限を持つユーザー** のみ実行可能（GitHub Actions のデフォルト）
- main ブランチへの直接プッシュはブランチ保護ルールで防御
- `concurrency` で同一 PR への並列実行を防止

## 今後の展望

| フェーズ | 内容 | 状態 |
|---------|------|------|
| **Phase 1** | PR 自動レビュー + CI 失敗分析 | ✅ 完了 |
| **Phase 2** | `/ai-fix` コマンドで自動修正 | ✅ 完了 |
| **Phase 3** | CI 失敗時の条件付き自動修正 | 予定 |

## まとめ

- **Phase 1**: `claude-code-action@v1` + ツール使用禁止で **PR 自動レビュー** を構築
- **Phase 2**: `/ai-fix` コマンドでツール使用有効化し **自動修正** を実装
- 結果の JSON から Python で抽出 → `gh pr comment` で投稿する共通パターン
- Issue の受け入れ条件を自動収集して、要件充足もチェック
- Phase 1 → Phase 2 の連携: レビューコメントに `/ai-fix` ヒントを自動追加
- すべて Pro プラン内で追加課金なし

個人開発でも「第三者の目」が入るのは品質向上に効果的です。Phase 1 で指摘された問題を Phase 2 で自動修正できるので、レビュー → 修正のサイクルがコメント1つで完結します。
