#!/usr/bin/env bash
# ============================================================
# 負荷テスト実行スクリプト
#
# 使い方:
#   ./loadtest/run.sh          # S1 プラン (デフォルト)
#   ./loadtest/run.sh s2       # S2 プラン
#   ./loadtest/run.sh s3       # S3 プラン
#
# 前提:
#   - Docker Desktop が起動していること
#   - プロジェクトルートから実行すること
# ============================================================

set -euo pipefail

PLAN="${1:-s1}"

case "$PLAN" in
  s1)
    export APP_CPUS="1"
    export APP_MEMORY="1.75g"
    echo "=== Azure App Service S1 相当 (1 コア / 1.75 GB) ==="
    ;;
  s2)
    export APP_CPUS="2"
    export APP_MEMORY="3.5g"
    echo "=== Azure App Service S2 相当 (2 コア / 3.5 GB) ==="
    ;;
  s3)
    export APP_CPUS="4"
    export APP_MEMORY="7g"
    echo "=== Azure App Service S3 相当 (4 コア / 7 GB) ==="
    ;;
  *)
    echo "使い方: $0 [s1|s2|s3]"
    exit 1
    ;;
esac

echo ""
echo "1. コンテナをビルド・起動..."
docker compose -f compose.yml -f compose.loadtest.yml up -d --build

echo ""
echo "2. API の起動を待機中..."
# aspnet ランタイムイメージには curl が入っていないため、ホスト側からチェック
PORTS=("identity-api:5001" "catalog-api:5002" "order-api:5003")
for entry in "${PORTS[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  echo -n "   ${svc} を待機中"
  for i in $(seq 1 60); do
    if curl -sf "http://localhost:${port}/health" > /dev/null 2>&1; then
      echo " ... OK"
      break
    fi
    echo -n "."
    sleep 2
  done
done

echo ""
echo "3. リソース制約の確認:"
for svc in identity-api catalog-api order-api; do
  container="inv-${svc}"
  echo "   ${svc}:"
  docker stats --no-stream --format "     CPU 制限: {{.CPUPerc}} | メモリ: {{.MemUsage}} / {{.MemPerc}}" "$container" 2>/dev/null || echo "     (確認できませんでした)"
done

echo ""
echo "4. k6 負荷テスト開始..."
echo "   スクリプト: /scripts/main.js"
echo ""
MSYS_NO_PATHCONV=1 docker compose -f compose.yml -f compose.loadtest.yml \
  --profile loadtest run --rm k6 run /scripts/main.js

echo ""
echo "=== 負荷テスト完了 ==="
echo ""
echo "コンテナを停止するには:"
echo "  docker compose -f compose.yml -f compose.loadtest.yml down"
