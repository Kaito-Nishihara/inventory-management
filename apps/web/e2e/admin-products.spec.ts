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

const categoryId = "cat-1"
const existingProductId = "b8a20f8c-c08d-404b-8ea3-cc0a77bf89b2"

function publishedProduct(id: string, name: string, price: number) {
  return {
    id,
    categoryId,
    categoryKey: "pc",
    categoryName: "周辺機器",
    name,
    description: `${name} description`,
    price,
    onHand: 10,
    reserved: 2,
    available: 8,
    version: 1,
  }
}

test("user ロールでは商品管理ページにアクセスできない", async ({ page }) => {
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

  await page.goto("/admin/products")
  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "商品管理（作成/更新/公開切替）" })).not.toBeVisible()
})

test("admin が商品を作成・更新・公開切替できる", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  const publishedItems = [publishedProduct(existingProductId, "既存キーボード", 12000)]
  const createdProductId = "c6212498-a301-4ec2-b812-cb7dc0fefaa0"
  let createdPublished = false

  await page.route("**://localhost:5002/categories", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: categoryId, key: "pc", name: "周辺機器", sortOrder: 1 }]),
    })
  })

  await page.route("**://localhost:5002/products?*", async (route) => {
    const items = createdPublished ? [...publishedItems, publishedProduct(createdProductId, "新規マウス", 6800)] : publishedItems
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items,
        totalCount: items.length,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      }),
    })
  })

  await page.route("**://localhost:5002/admin/products", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ productId: createdProductId }),
    })
  })

  await page.route(`**://localhost:5002/admin/products/${createdProductId}`, async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })

  await page.route(`**://localhost:5002/admin/products/${createdProductId}/publish`, async (route) => {
    createdPublished = true
    await route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/admin/products")
  await expect(page.getByRole("heading", { name: "商品管理（作成/更新/公開切替）" })).toBeVisible()

  await page.getByLabel("商品名（新規）").fill("新規マウス")
  await page.getByLabel("商品説明（新規）").fill("操作性の高いマウス")
  await page.getByLabel("価格（新規）").fill("6800")
  await page.getByRole("button", { name: "商品を作成する" }).click()
  await expect(page.getByText("商品を作成しました。")).toBeVisible()
  await expect(page.getByText("非公開")).toBeVisible()

  await page.getByLabel("商品名（更新）").fill("新規マウス 改")
  await page.getByRole("button", { name: "商品情報を更新する" }).click()
  await expect(page.getByText("商品情報を更新しました。")).toBeVisible()

  await page.getByRole("button", { name: "公開にする" }).click()
  await expect(page.getByText("商品を公開しました。")).toBeVisible()
})

test("admin 商品作成時に403/409エラーを表示できる", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  await page.route("**://localhost:5002/categories", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: categoryId, key: "pc", name: "周辺機器", sortOrder: 1 }]),
    })
  })
  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 }),
    })
  })

  let callCount = 0
  await page.route("**://localhost:5002/admin/products", async (route) => {
    callCount += 1
    if (callCount === 1) {
      await route.fulfill({ status: 403, contentType: "text/plain", body: '"forbidden"' })
      return
    }
    await route.fulfill({ status: 409, contentType: "text/plain", body: '"conflict"' })
  })

  await page.goto("/admin/products")
  await page.getByLabel("商品名（新規）").fill("エラー商品")
  await page.getByLabel("商品説明（新規）").fill("エラー検証")
  await page.getByLabel("価格（新規）").fill("1000")

  await page.getByRole("button", { name: "商品を作成する" }).click()
  await expect(page.getByText("この操作を実行する権限がありません。")).toBeVisible()

  await page.getByRole("button", { name: "商品を作成する" }).click()
  await expect(page.getByText("在庫不足のため注文できません。")).toBeVisible()
})
