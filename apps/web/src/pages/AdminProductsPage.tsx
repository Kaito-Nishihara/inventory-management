import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import { validateAdminProductInput } from "../features/catalog/adminProductValidation"
import type { CategoryResponse, ProductListResponse, ProductResponse } from "../features/catalog/types"

type AdminProductMutationResult = {
  ok: boolean
  code?: string
  message: string
  productId?: string
}

type AdminProductDraft = {
  categoryId: string
  name: string
  description: string
  price: number
}

type AdminProductsPageProps = {
  onLogout: () => void
  fetchCategories: () => Promise<CategoryResponse[]>
  fetchAdminProductsPage: (query: {
    q?: string
    categoryId?: string
    sort?: string
    page: number
    pageSize: number
  }) => Promise<ProductListResponse>
  createAdminProduct: (draft: AdminProductDraft) => Promise<AdminProductMutationResult>
  updateAdminProduct: (productId: string, draft: AdminProductDraft) => Promise<AdminProductMutationResult>
  setAdminProductPublish: (productId: string, isPublished: boolean) => Promise<AdminProductMutationResult>
}

type ManagedProduct = ProductResponse & { isPublished: boolean }

function toManagedProduct(item: ProductResponse): ManagedProduct {
  return { ...item, isPublished: item.isPublished ?? false }
}

function AdminProductsPage({
  onLogout,
  fetchCategories,
  fetchAdminProductsPage,
  createAdminProduct,
  updateAdminProduct,
  setAdminProductPublish,
}: AdminProductsPageProps) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [products, setProducts] = useState<ManagedProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [createCategoryId, setCreateCategoryId] = useState("")
  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createPriceText, setCreatePriceText] = useState("")

  const [editCategoryId, setEditCategoryId] = useState("")
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriceText, setEditPriceText] = useState("")

  const selectedProduct = useMemo(
    () => products.find((x) => x.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const categoryNameMap = useMemo(() => {
    return new Map(categories.map((x) => [x.id, x.name]))
  }, [categories])

  const loadInitialData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [categoryRows, productRows] = await Promise.all([
        fetchCategories(),
        fetchAdminProductsPage({ page: 1, pageSize: 50, sort: "newest" }),
      ])

      setCategories(categoryRows)
      setProducts(productRows.items.map(toManagedProduct))
      if (!createCategoryId && categoryRows.length > 0) {
        setCreateCategoryId(categoryRows[0].id)
      }
      if (!selectedProductId && productRows.items.length > 0) {
        setSelectedProductId(productRows.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "初期データの取得に失敗しました。")
    } finally {
      setIsLoading(false)
    }
  }, [createCategoryId, fetchAdminProductsPage, fetchCategories, selectedProductId])

  const reloadPublishedProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAdminProductsPage({ page: 1, pageSize: 50, sort: "newest" })
      setProducts(result.items.map((x) => ({ ...x, isPublished: x.isPublished ?? false })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "商品一覧の再取得に失敗しました。")
    } finally {
      setIsLoading(false)
    }
  }, [fetchAdminProductsPage])

  useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    if (!selectedProduct) return
    setEditCategoryId(selectedProduct.categoryId)
    setEditName(selectedProduct.name)
    setEditDescription(selectedProduct.description)
    setEditPriceText(String(selectedProduct.price))
  }, [selectedProduct])

  const handleCreate = async () => {
    const validation = validateAdminProductInput({
      categoryId: createCategoryId,
      name: createName,
      description: createDescription,
      priceText: createPriceText,
    })
    if (!validation.ok) {
      setError(validation.message)
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const result = await createAdminProduct({
        categoryId: createCategoryId,
        name: createName.trim(),
        description: createDescription.trim(),
        price: validation.price,
      })

      if (!result.ok || !result.productId) {
        setError(result.message)
        return
      }

      const product: ManagedProduct = {
        id: result.productId,
        categoryId: createCategoryId,
        categoryKey: "",
        categoryName: categoryNameMap.get(createCategoryId) ?? "-",
        name: createName.trim(),
        description: createDescription.trim(),
        price: validation.price,
        isPublished: false,
        onHand: 0,
        reserved: 0,
        available: 0,
        version: 0,
      }

      setProducts((prev) => [product, ...prev])
      setSelectedProductId(product.id)
      setCreateName("")
      setCreateDescription("")
      setCreatePriceText("")
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "商品の作成に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedProduct) return

    const validation = validateAdminProductInput({
      categoryId: editCategoryId,
      name: editName,
      description: editDescription,
      priceText: editPriceText,
    })
    if (!validation.ok) {
      setError(validation.message)
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const result = await updateAdminProduct(selectedProduct.id, {
        categoryId: editCategoryId,
        name: editName.trim(),
        description: editDescription.trim(),
        price: validation.price,
      })

      if (!result.ok) {
        setError(result.message)
        return
      }

      setProducts((prev) =>
        prev.map((item) =>
          item.id === selectedProduct.id
            ? {
                ...item,
                categoryId: editCategoryId,
                categoryName: categoryNameMap.get(editCategoryId) ?? "-",
                name: editName.trim(),
                description: editDescription.trim(),
                price: validation.price,
              }
            : item,
        ),
      )
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "商品の更新に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async () => {
    if (!selectedProduct) return

    const nextPublish = !selectedProduct.isPublished
    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const result = await setAdminProductPublish(selectedProduct.id, nextPublish)
      if (!result.ok) {
        setError(result.message)
        return
      }

      setProducts((prev) =>
        prev.map((item) =>
          item.id === selectedProduct.id
            ? {
                ...item,
                isPublished: nextPublish,
              }
            : item,
        ),
      )

      if (nextPublish) {
        await reloadPublishedProducts()
      }
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "公開状態の更新に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-zinc-400">Admin</p>
            <h1 className="text-lg font-semibold text-white">商品管理（作成/更新/公開切替）</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/products")}>商品一覧</Button>
            <Button onClick={() => navigate("/admin/inventory")}>在庫管理</Button>
            <Button onClick={() => navigate("/orders")}>注文履歴</Button>
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_1.2fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">商品一覧</h2>
              <Button onClick={() => void reloadPublishedProducts()} disabled={isLoading}>
                再取得
              </Button>
            </div>
            {isLoading && <p className="mt-3 text-sm text-zinc-300">読み込み中...</p>}
            <ul className="mt-3 space-y-2">
              {products.map((product) => {
                const selected = product.id === selectedProductId
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedProductId(product.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left ${
                        selected
                          ? "border-zinc-200 bg-zinc-700/55"
                          : "border-zinc-600/45 bg-zinc-900/55 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{product.name}</p>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            product.isPublished
                              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                              : "border-zinc-500/40 bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {product.isPublished ? "公開中" : "非公開"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        カテゴリ: {product.categoryName} / 価格: ¥{product.price.toLocaleString("ja-JP")}
                      </p>
                    </button>
                  </li>
                )
              })}
              {!isLoading && products.length === 0 && (
                <li className="rounded-xl border border-zinc-600/45 bg-zinc-900/55 px-4 py-3 text-sm text-zinc-300">
                  商品がありません。
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">新規作成</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-sm">
                カテゴリ（新規）
                <select
                  value={createCategoryId}
                  onChange={(event) => setCreateCategoryId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                商品名（新規）
                <input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                商品説明（新規）
                <textarea
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                  className="mt-1 h-24 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-sm">
                価格（新規）
                <input
                  type="number"
                  min={1}
                  value={createPriceText}
                  onChange={(event) => setCreatePriceText(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <Button variant="primary" onClick={() => void handleCreate()} disabled={isSubmitting}>
                商品を作成する
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold">商品更新 / 公開切替</h2>
            {!selectedProduct && <p className="mt-3 text-sm text-zinc-300">左の一覧から商品を選択してください。</p>}
            {selectedProduct && (
              <div className="mt-3 space-y-3">
                <label className="block text-sm">
                  カテゴリ（更新）
                  <select
                    value={editCategoryId}
                    onChange={(event) => setEditCategoryId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  商品名（更新）
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-sm">
                  商品説明（更新）
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    className="mt-1 h-28 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-sm">
                  価格（更新）
                  <input
                    type="number"
                    min={1}
                    value={editPriceText}
                    onChange={(event) => setEditPriceText(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" onClick={() => void handleUpdate()} disabled={isSubmitting}>
                    商品情報を更新する
                  </Button>
                  <Button onClick={() => void handleTogglePublish()} disabled={isSubmitting}>
                    {selectedProduct.isPublished ? "非公開にする" : "公開にする"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,720px)] -translate-x-1/2 rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(90vw,720px)] -translate-x-1/2 rounded-xl border border-zinc-500/40 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100">
          {message}
        </div>
      )}
    </main>
  )
}

export default AdminProductsPage
export type { AdminProductsPageProps, AdminProductDraft, AdminProductMutationResult }
