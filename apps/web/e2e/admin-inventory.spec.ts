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

test("admin inventory page is accessible only by admin role", async ({ page }) => {
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

  await page.goto("/admin/inventory")

  await expect(page.getByRole("heading", { name: "商品一覧" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "ロケーション在庫管理" })).not.toBeVisible()
})

test("admin can create and progress transfer status", async ({ page }) => {
  await page.addInitScript((token) => {
    localStorage.setItem("inventory.jwt", token)
  }, createJwt("admin"))

  const productId = "fe8af9f9-f0b3-45e6-a74f-4cf0b7e10001"
  const transferId = "c7d8ce2e-179d-42f5-a775-8f4976f90001"
  const wh = "0ccafe00-0000-4000-8000-000000000001"
  const store = "0ccafe00-0000-4000-8000-000000000002"
  let transferStatus: "none" | "移動指示" | "出荷済み" | "入荷済み" = "none"

  await page.route("**://localhost:5002/products?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
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
          },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    })
  })

  await page.route("**://localhost:5002/admin/inventory/locations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: wh, code: "WH-TOKYO", name: "東京中央倉庫", type: "warehouse" },
        { id: store, code: "STORE-SHIBUYA", name: "渋谷店", type: "store" },
      ]),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/location-stocks`, async (route) => {
    const warehouseOnHand = transferStatus === "none" || transferStatus === "移動指示" ? 20 : 18
    const storeOnHand = transferStatus === "入荷済み" ? 5 : 3
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          locationId: wh,
          locationCode: "WH-TOKYO",
          locationName: "東京中央倉庫",
          locationType: "warehouse",
          onHand: warehouseOnHand,
          version: 1,
          inTransitOut: transferStatus === "出荷済み" ? 2 : 0,
          inTransitIn: 0,
        },
        {
          locationId: store,
          locationCode: "STORE-SHIBUYA",
          locationName: "渋谷店",
          locationType: "store",
          onHand: storeOnHand,
          version: 1,
          inTransitOut: 0,
          inTransitIn: transferStatus === "出荷済み" ? 2 : 0,
        },
      ]),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/${productId}/transfers?*`, async (route) => {
    if (transferStatus === "none") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: transferId,
          productId,
          fromLocationId: wh,
          toLocationId: store,
          quantity: 2,
          status: transferStatus,
          note: "店舗補充",
          createdAtUtc: "2026-03-01T00:00:00Z",
          shippedAtUtc: transferStatus === "出荷済み" || transferStatus === "入荷済み" ? "2026-03-01T01:00:00Z" : null,
          receivedAtUtc: transferStatus === "入荷済み" ? "2026-03-01T02:00:00Z" : null,
        },
      ]),
    })
  })

  await page.route("**://localhost:5002/admin/inventory/transfers", async (route) => {
    transferStatus = "移動指示"
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ transferId }),
    })
  })

  await page.route(`**://localhost:5002/admin/inventory/transfers/${transferId}/ship`, async (route) => {
    transferStatus = "出荷済み"
    await route.fulfill({ status: 204, body: "" })
  })

  await page.route(`**://localhost:5002/admin/inventory/transfers/${transferId}/receive`, async (route) => {
    transferStatus = "入荷済み"
    await route.fulfill({ status: 204, body: "" })
  })

  await page.goto("/admin/inventory")
  await expect(page.getByRole("heading", { name: "ロケーション在庫管理" })).toBeVisible()

  await page.getByLabel("数量").fill("2")
  await page.getByPlaceholder("店舗補充 / 欠品対応 など").fill("店舗補充")
  await page.getByRole("button", { name: "移動指示を作成する" }).click()
  await expect(page.getByText("在庫移動を指示しました。")).toBeVisible()
  await expect(page.getByText("移動指示", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "出荷確定" }).click()
  await expect(page.getByText("出荷を確定しました。")).toBeVisible()
  await expect(page.getByText("出荷済み")).toBeVisible()

  await page.getByRole("button", { name: "入荷確定" }).click()
  await expect(page.getByText("入荷を確定しました。")).toBeVisible()
  await expect(page.getByText("入荷済み")).toBeVisible()
})
