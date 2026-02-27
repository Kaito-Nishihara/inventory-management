import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import Button from "../components/ui/Button"
import { buildFilterSearchParams, parseFilterState } from "../features/catalog/productFilters"
import {
  ALL_CATEGORY_ID,
  SORT_LABELS,
  type CartItem,
  type CategoryResponse,
  type ProductListResponse,
  type ProductResponse,
  type ProductSort,
  type ProductStatus,
} from "../features/catalog/types"

type ProductsPageProps = {
  orderMessage: string | null
  cartItems: CartItem[]
  isCheckoutLoading: boolean
  onLogout: () => void
  onAddToCart: (product: ProductResponse) => void
  onRemoveFromCart: (productId: string) => void
  onCartQuantityChange: (productId: string, quantity: number) => void
  onCheckout: () => Promise<void>
  fetchCategories: () => Promise<CategoryResponse[]>
  fetchProductsPage: (query: {
    q?: string
    categoryId?: string
    sort?: string
    page: number
    pageSize: number
  }) => Promise<ProductListResponse>
}

function ProductsPage({
  orderMessage,
  cartItems,
  isCheckoutLoading,
  onLogout,
  onAddToCart,
  onRemoveFromCart,
  onCartQuantityChange,
  onCheckout,
  fetchCategories,
  fetchProductsPage,
}: ProductsPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [hasUnreadNotice] = useState(true)

  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [productsStatus, setProductsStatus] = useState<ProductStatus>("idle")
  const [productsError, setProductsError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const filterState = useMemo(() => parseFilterState(searchParams), [searchParams])

  const cartSummary = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return { totalQuantity, totalAmount }
  }, [cartItems])

  const loadProducts = useCallback(async () => {
    setProductsStatus("loading")
    setProductsError(null)

    try {
      const result = await fetchProductsPage({
        q: filterState.keyword || undefined,
        categoryId: filterState.categoryId === ALL_CATEGORY_ID ? undefined : filterState.categoryId,
        sort: filterState.sort,
        page: filterState.page,
        pageSize: 20,
      })

      setProducts(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
      setProductsStatus("success")
    } catch (err) {
      setProductsStatus("error")
      setProductsError(err instanceof Error ? err.message : "商品一覧の取得に失敗しました。")
    }
  }, [fetchProductsPage, filterState.categoryId, filterState.keyword, filterState.page, filterState.sort])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories()
        setCategories(data)
      } catch {
        setCategories([])
      }
    }

    void loadCategories()
  }, [fetchCategories])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProducts()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadProducts])

  const updateFilter = (patch: Partial<typeof filterState>) => {
    const next = { ...filterState, ...patch }
    setSearchParams(buildFilterSearchParams(next), { replace: true })
  }

  const handleCategoryChange = (categoryId: string) => {
    updateFilter({ categoryId, page: 1 })
  }

  const handleSortChange = (sort: ProductSort) => {
    updateFilter({ sort, page: 1 })
  }

  const handleKeywordChange = (value: string) => {
    updateFilter({ keyword: value, page: 1 })
  }

  const handleCheckoutWithReload = async () => {
    await onCheckout()
    await loadProducts()
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-600/60" />
            <div>
              <p className="text-sm font-semibold text-zinc-100">Inventory Platform</p>
              <p className="text-xs text-zinc-400">Catalog</p>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <Button onClick={() => setIsCartOpen(true)}>カート ({cartSummary.totalQuantity})</Button>
            <Button aria-label="通知" size="icon" className="relative">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 2a6 6 0 0 0-6 6v3.7l-1.7 2.9A1 1 0 0 0 5.2 16h13.6a1 1 0 0 0 .9-1.4L18 11.7V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22Z" />
              </svg>
              {hasUnreadNotice && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-300" />}
            </Button>
            <Button aria-label="アカウント" onClick={() => setIsAccountMenuOpen((prev) => !prev)} size="icon">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
              </svg>
            </Button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-12 w-52 rounded-xl border border-zinc-600/60 bg-zinc-800/95 p-2 shadow-xl">
                <p className="px-3 py-2 text-xs text-zinc-400">サインイン中</p>
                <p className="px-3 pb-2 text-sm text-zinc-100">admin@test.com</p>
                <Button onClick={onLogout} variant="ghost" className="w-full justify-start px-3 py-2 text-left text-sm">
                  ログアウト
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-white">商品一覧</h1>
          <div className="flex items-center gap-3">
            <Button onClick={() => void loadProducts()}>再読み込み</Button>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-4">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
            <input
              value={filterState.keyword}
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="商品名・説明で検索"
              className="w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400/60"
            />
            <select
              value={filterState.sort}
              onChange={(event) => handleSortChange(event.target.value as ProductSort)}
              className="w-full rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-400/60"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[{ id: ALL_CATEGORY_ID, name: "すべて" }, ...categories].map((category) => {
              const selected = filterState.categoryId === category.id
              return (
                <Button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={selected ? "bg-zinc-300 text-zinc-900 hover:bg-zinc-300" : ""}
                >
                  {category.name}
                </Button>
              )
            })}
          </div>
        </section>

        {productsStatus === "loading" && (
          <div className="rounded-xl border border-zinc-600/45 bg-zinc-800/55 px-4 py-3 text-sm text-zinc-200">
            商品一覧を読み込み中...
          </div>
        )}

        {productsStatus === "error" && productsError && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {productsError}
          </div>
        )}

        {orderMessage && (
          <div className="mb-4 rounded-xl border border-zinc-500/50 bg-zinc-700/45 px-4 py-3 text-sm text-zinc-100">
            {orderMessage}
          </div>
        )}

        <div className="mb-3 text-sm text-zinc-300">
          {totalCount.toLocaleString("ja-JP")} 件中 {(products.length > 0 ? ((filterState.page - 1) * 20 + 1) : 0).toLocaleString("ja-JP")}
          -{((filterState.page - 1) * 20 + products.length).toLocaleString("ja-JP")} 件表示
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5 shadow-lg shadow-black/20"
            >
              <h2 className="text-lg font-semibold text-white">{product.name}</h2>
              <p className="mt-1 text-xs text-zinc-400">カテゴリ: {product.categoryName}</p>
              <p className="mt-2 text-sm text-zinc-300">{product.description}</p>
              <div className="mt-4 space-y-1 text-sm text-zinc-200">
                <p>価格: ¥{product.price.toLocaleString("ja-JP")}</p>
                <p>販売可能在庫: {product.available}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => onAddToCart(product)}
                  disabled={product.available <= 0}
                  variant="primary"
                  fullWidth
                >
                  {product.available <= 0 ? "在庫なし" : "カートに追加"}
                </Button>
                <Button
                  fullWidth
                  onClick={() => {
                    const query = searchParams.toString()
                    navigate(`/products/${product.id}${query ? `?${query}` : ""}`)
                  }}
                >
                  詳細
                </Button>
              </div>
            </article>
          ))}
        </div>

        {productsStatus === "success" && products.length === 0 && (
          <div className="rounded-xl border border-zinc-600/45 bg-zinc-800/55 px-4 py-3 text-sm text-zinc-300">
            条件に一致する商品がありません。
          </div>
        )}

        <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-600/45 bg-zinc-800/55 p-3">
          <Button onClick={() => updateFilter({ page: Math.max(1, filterState.page - 1) })} disabled={filterState.page <= 1}>
            前へ
          </Button>
          <p className="text-sm text-zinc-300">ページ {filterState.page} / {Math.max(1, totalPages)}</p>
          <Button
            onClick={() => updateFilter({ page: Math.min(Math.max(1, totalPages), filterState.page + 1) })}
            disabled={filterState.page >= Math.max(1, totalPages)}
          >
            次へ
          </Button>
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-40">
          <Button
            aria-label="カートを閉じる"
            onClick={() => setIsCartOpen(false)}
            variant="ghost"
            className="absolute inset-0 h-full w-full rounded-none bg-zinc-950/55 hover:bg-zinc-950/55"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-zinc-600/50 bg-zinc-800/92 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">カート</h2>
              <Button onClick={() => setIsCartOpen(false)} size="sm">
                閉じる
              </Button>
            </div>

            <div className="mb-4 rounded-xl border border-zinc-600/45 bg-zinc-700/45 p-4 text-sm text-zinc-200">
              <p>商品点数: {cartSummary.totalQuantity} 点</p>
              <p className="mt-1 text-base font-semibold text-white">
                合計金額: ¥{cartSummary.totalAmount.toLocaleString("ja-JP")}
              </p>
            </div>

            <div className="space-y-3 overflow-y-auto pb-40">
              {cartItems.length === 0 && <p className="text-sm text-zinc-300">カートは空です。</p>}

              {cartItems.map((item) => (
                <div key={item.productId} className="rounded-xl border border-zinc-600/45 bg-zinc-800/55 px-4 py-3">
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    単価: ¥{item.price.toLocaleString("ja-JP")} / 在庫: {item.available}
                  </p>
                  <p className="mt-1 text-sm text-zinc-100">小計: ¥{(item.price * item.quantity).toLocaleString("ja-JP")}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, item.available)}
                      value={item.quantity}
                      onChange={(event) => onCartQuantityChange(item.productId, Number(event.target.value))}
                      className="w-20 rounded-lg border border-zinc-500/45 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-100"
                    />
                    <Button onClick={() => onRemoveFromCart(item.productId)} size="sm">
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-600/50 bg-zinc-800/92 p-5">
              <Button
                onClick={() => void handleCheckoutWithReload()}
                disabled={isCheckoutLoading || cartItems.length === 0}
                variant="primary"
                size="lg"
                fullWidth
              >
                {isCheckoutLoading ? "注文処理中..." : "注文を確定"}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

export default ProductsPage
