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

function mockProduct(onHand: number, version: number) {
  return {
    id: productId,
    categoryId: "cat-1",
    categoryKey: "pc",
    categoryName: "周辺機器",
    name: "メカニカルキーボード",
    description: "test",
    price: 12800,
    onHand,
    reserved: 2,
    available: onHand - 2,
    version,
  }
}

test("user ロールでは在庫操作ページにアクセスできない", async ({ page }) => {
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

  await page.goto("/admin/inventory/operations")
  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "在庫操作（入庫/出庫/棚卸）" })).not.toBeVisible()
})

test("admin が入庫を実行できる", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  let currentOnHand = 20
  let currentVersion = 3

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [mockProduct(currentOnHand, currentVersion)],
        totalCount: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
      }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transactions?*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "tx-1",
          productId,
          type: "receive",
          quantityDelta: 5,
          onHandAfter: currentOnHand,
          reservedAfter: 2,
          note: "仕入れ",
          createdAtUtc: "2026-03-01T00:00:00Z",
        },
      ]),
    })
  })

  await page.route("**://localhost:5002/admin/inventory/receive", async (route) => {
    currentOnHand = 25
    currentVersion = 4
    await route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/admin/inventory/operations")
  await expect(page.getByRole("heading", { name: "在庫操作（入庫/出庫/棚卸）" })).toBeVisible()

  // 入庫タブが初期状態で選択されている
  await expect(page.getByRole("button", { name: "入庫を実行する" })).toBeVisible()

  await page.getByLabel("数量").fill("5")
  await page.getByPlaceholder("仕入先 / 発注番号 など").fill("仕入れ")
  await page.getByRole("button", { name: "入庫を実行する" }).click()
  await expect(page.getByText("入庫を実行しました。")).toBeVisible()
})

test("admin が出庫を実行できる", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [mockProduct(20, 3)],
        totalCount: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
      }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transactions?*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**://localhost:5002/admin/inventory/issue", async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/admin/inventory/operations")

  // 出庫タブを選択
  await page.getByRole("button", { name: "出庫", exact: true }).click()
  await expect(page.getByRole("button", { name: "出庫を実行する" })).toBeVisible()

  await page.getByLabel("数量").fill("3")
  await page.getByPlaceholder("出荷先 / 理由 など").fill("返品")
  await page.getByRole("button", { name: "出庫を実行する" }).click()
  await expect(page.getByText("出庫を実行しました。")).toBeVisible()
})

test("admin が棚卸調整を実行できる", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [mockProduct(20, 3)],
        totalCount: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
      }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transactions?*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**://localhost:5002/admin/inventory/adjust", async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/admin/inventory/operations")

  // 棚卸調整タブを選択
  await page.getByRole("button", { name: "棚卸調整", exact: true }).click()
  await expect(page.getByRole("button", { name: "棚卸調整を実行する" })).toBeVisible()

  await page.getByLabel("新しい在庫数").fill("18")
  await page.getByPlaceholder("棚卸調整の理由 など").fill("実棚差異")
  await page.getByRole("button", { name: "棚卸調整を実行する" }).click()
  await expect(page.getByText("棚卸調整を実行しました。")).toBeVisible()
})

test("409 競合時に再試行導線が表示される", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [mockProduct(20, 3)],
        totalCount: 1,
        page: 1,
        pageSize: 30,
        totalPages: 1,
      }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transactions?*`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  })

  await page.route("**://localhost:5002/admin/inventory/receive", async (route) => {
    await route.fulfill({ status: 409, contentType: "text/plain", body: '"version_conflict"' })
  })

  await page.goto("/admin/inventory/operations")

  await page.getByLabel("数量").fill("5")
  await page.getByRole("button", { name: "入庫を実行する" }).click()

  // 競合メッセージと再試行ボタンが表示される
  await expect(page.getByText("バージョン競合が発生しました")).toBeVisible()
  await expect(page.getByRole("button", { name: "最新データを取得する" })).toBeVisible()

  // 再取得ボタンをクリック
  await page.getByRole("button", { name: "最新データを取得する" }).click()
  await expect(page.getByText("最新のデータを取得しました。")).toBeVisible()
})
