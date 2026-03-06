import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("inventory.jwt", "e2e-dummy-token")
  })
})

test("checkout page shows partial failure and retries failed lines only", async ({ page }) => {
  let orderCount = 0

  await page.route("**/categories", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "cat-1", key: "food", name: "食品", sortOrder: 1 },
      ]),
    })
  })

  await page.route("**/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "p-1",
            categoryId: "cat-1",
            categoryKey: "food",
            categoryName: "食品",
            name: "テスト米 5kg",
            description: "E2E product 1",
            price: 3000,
            onHand: 10,
            reserved: 0,
            available: 10,
            version: 1,
          },
          {
            id: "p-2",
            categoryId: "cat-1",
            categoryKey: "food",
            categoryName: "食品",
            name: "テスト水 2L",
            description: "E2E product 2",
            price: 200,
            onHand: 10,
            reserved: 0,
            available: 10,
            version: 1,
          },
        ],
        totalCount: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    })
  })

  await page.route("**/orders", async (route) => {
    orderCount += 1
    const payload = route.request().postDataJSON() as { productId: string }

    if (payload.productId === "p-2" && orderCount === 2) {
      await route.fulfill({ status: 409, contentType: "application/json", body: "{}" })
      return
    }

    await route.fulfill({ status: 201, contentType: "application/json", body: "{}" })
  })

  await page.goto("/products")
  await page.getByRole("button", { name: "カートに追加" }).first().click()
  await page.getByRole("button", { name: "カートに追加" }).nth(1).click()
  await page.getByRole("button", { name: "カート (2)" }).click()

  await expect(page.getByRole("heading", { name: "注文手続き" })).toBeVisible()
  await expect(page.getByText("¥3,200")).toBeVisible()

  await page.getByRole("button", { name: "注文を確定する" }).click()
  await expect(page.getByText("一部成功（成功:1件 / 失敗:1件）")).toBeVisible()
  await expect(page.getByText("在庫不足のため注文できません。")).toBeVisible()
  await expect(page.getByRole("button", { name: "失敗分を再試行" })).toBeVisible()

  await page.getByRole("button", { name: "失敗分を再試行" }).click()
  await expect(page.getByText("注文を作成しました（1件）。")).toBeVisible()
  await expect(page.getByText("カートは空です。商品一覧から商品を追加してください。")).toBeVisible()
})

test("checkout page updates total amount when quantity changes", async ({ page }) => {
  await page.route("**/categories", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "cat-1", key: "food", name: "食品", sortOrder: 1 },
      ]),
    })
  })

  await page.route("**/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: "p-1",
            categoryId: "cat-1",
            categoryKey: "food",
            categoryName: "食品",
            name: "テスト米 5kg",
            description: "E2E product 1",
            price: 3000,
            onHand: 10,
            reserved: 0,
            available: 10,
            version: 1,
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    })
  })

  await page.goto("/products")
  await page.getByRole("button", { name: "カートに追加" }).first().click()
  await page.getByRole("button", { name: "カート (1)" }).click()

  await expect(page.getByText("¥3,000", { exact: true })).toBeVisible()
  await page.getByLabel("数量").fill("2")
  await expect(page.getByText("¥6,000")).toBeVisible()
})
