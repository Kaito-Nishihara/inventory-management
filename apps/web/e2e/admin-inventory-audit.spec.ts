import { expect, test } from "@playwright/test"

function createJwt(role: "admin" | "user"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = btoa(
    JSON.stringify({
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": role,
      sub: "2",
    }),
  )
  return `${header}.${payload}.signature`
}

const productId = "fe8af9f9-f0b3-45e6-a74f-4cf0b7e10001"

test("user ロールでは監査画面にアクセスできない", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("user"))

  await page.route("**://localhost:5002/categories", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }),
    })
  })

  await page.goto("/admin/inventory/audit")
  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "在庫履歴・監査ログ" })).not.toBeVisible()
})

test("admin が商品/期間フィルタで在庫履歴と監査ログを表示できる", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  let transactionRequestUrl = ""

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{
          id: productId,
          categoryId: "cat-1",
          categoryKey: "pc",
          categoryName: "周辺機器",
          name: "メカニカルキーボード",
          description: "test",
          price: 12800,
          onHand: 20,
          reserved: 2,
          available: 18,
          version: 3,
        }],
        totalCount: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
      }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transactions?*`, async (route) => {
    transactionRequestUrl = route.request().url()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "tx-1",
        productId,
        type: "receive",
        quantityDelta: 5,
        onHandAfter: 20,
        reservedAfter: 2,
        note: "仕入れ",
        createdAtUtc: "2026-03-01T00:00:00Z",
      }]),
    })
  })

  await page.route("**://localhost:5001/admin/auth-audit-logs?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "log-1",
        userId: "2",
        action: "login",
        success: true,
        detail: null,
        createdAtUtc: "2026-03-01T00:30:00Z",
      }]),
    })
  })

  await page.goto("/admin/inventory/audit")
  await expect(page.getByRole("heading", { name: "在庫履歴・監査ログ" })).toBeVisible()

  await page.getByLabel("開始日").fill("2026-03-01")
  await page.getByLabel("終了日").fill("2026-03-08")
  await page.getByRole("button", { name: "再取得" }).click()

  await expect(page.getByText("在庫トランザクション")).toBeVisible()
  await expect(page.getByText("メモ: 仕入れ")).toBeVisible()
  await expect(page.getByText("認証監査ログ")).toBeVisible()
  await expect(page.getByText("操作: ログイン / userId: 2")).toBeVisible()
  await expect.poll(() => transactionRequestUrl).toContain("fromUtc=2026-03-01T00%3A00%3A00.000Z")
  await expect.poll(() => transactionRequestUrl).toContain("toUtc=2026-03-08T23%3A59%3A59.999Z")
})

test("APIエラー時にメッセージを表示する", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{
          id: productId,
          categoryId: "cat-1",
          categoryKey: "pc",
          categoryName: "周辺機器",
          name: "メカニカルキーボード",
          description: "test",
          price: 12800,
          onHand: 20,
          reserved: 2,
          available: 18,
          version: 3,
        }],
        totalCount: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
      }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transactions?*`, async (route) => {
    await route.fulfill({ status: 500, contentType: "text/plain", body: "server_error" })
  })

  await page.route("**://localhost:5001/admin/auth-audit-logs?*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.goto("/admin/inventory/audit")
  await expect(page.getByText("APIエラーが発生しました (500)")).toBeVisible()
})
