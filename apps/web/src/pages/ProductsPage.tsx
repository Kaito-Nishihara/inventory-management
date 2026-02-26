
import { useMemo, useState } from "react"
import Button from "../components/ui/Button"

type ProductResponse = {
  id: string
  name: string
  description: string
  price: number
  onHand: number
  reserved: number
  available: number
  version: number
}

type CartItem = {
  productId: string
  name: string
  price: number
  available: number
  quantity: number
}

type ProductStatus = "idle" | "loading" | "success" | "error"

type ProductsPageProps = {
  products: ProductResponse[]
  productsStatus: ProductStatus
  productsError: string | null
  orderMessage: string | null
  cartItems: CartItem[]
  isCheckoutLoading: boolean
  onReload: () => void
  onLogout: () => void
  onAddToCart: (product: ProductResponse) => void
  onRemoveFromCart: (productId: string) => void
  onCartQuantityChange: (productId: string, quantity: number) => void
  onCheckout: () => void
}

function ProductsPage({
  products,
  productsStatus,
  productsError,
  orderMessage,
  cartItems,
  isCheckoutLoading,
  onReload,
  onLogout,
  onAddToCart,
  onRemoveFromCart,
  onCartQuantityChange,
  onCheckout,
}: ProductsPageProps) {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [hasUnreadNotice] = useState(true)

  const cartSummary = useMemo(() => {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return { totalQuantity, totalAmount }
  }, [cartItems])

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
            <Button onClick={() => setIsCartOpen(true)}>
              カート ({cartSummary.totalQuantity})
            </Button>
            <Button
              aria-label="通知"
              size="icon"
              className="relative"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 2a6 6 0 0 0-6 6v3.7l-1.7 2.9A1 1 0 0 0 5.2 16h13.6a1 1 0 0 0 .9-1.4L18 11.7V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22Z" />
              </svg>
              {hasUnreadNotice && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-300" />
              )}
            </Button>
            <Button
              aria-label="アカウント"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              size="icon"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
              </svg>
            </Button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 top-12 w-52 rounded-xl border border-zinc-600/60 bg-zinc-800/95 p-2 shadow-xl">
                <p className="px-3 py-2 text-xs text-zinc-400">サインイン中</p>
                <p className="px-3 pb-2 text-sm text-zinc-100">admin@test.com</p>
                <Button
                  onClick={onLogout}
                  variant="ghost"
                  className="w-full justify-start px-3 py-2 text-left text-sm"
                >
                  ログアウト
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-white">商品一覧</h1>
          <div className="flex items-center gap-3">
            <Button onClick={onReload}>
              再読み込み
            </Button>
          </div>
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5 shadow-lg shadow-black/20"
            >
              <h2 className="text-lg font-semibold text-white">{product.name}</h2>
              <p className="mt-2 text-sm text-zinc-300">{product.description}</p>
              <div className="mt-4 space-y-1 text-sm text-zinc-200">
                <p>価格: ¥{product.price.toLocaleString("ja-JP")}</p>
                <p>販売可能在庫: {product.available}</p>
              </div>
              <Button
                onClick={() => onAddToCart(product)}
                disabled={product.available <= 0}
                variant="primary"
                fullWidth
                className="mt-4"
              >
                {product.available <= 0 ? "在庫なし" : "カートに追加"}
              </Button>
            </article>
          ))}
        </div>

        {productsStatus === "success" && products.length === 0 && (
          <div className="rounded-xl border border-zinc-600/45 bg-zinc-800/55 px-4 py-3 text-sm text-zinc-300">
            公開中の商品がありません。
          </div>
        )}
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
                <div
                  key={item.productId}
                  className="rounded-xl border border-zinc-600/45 bg-zinc-800/55 px-4 py-3"
                >
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    単価: ¥{item.price.toLocaleString("ja-JP")} / 在庫: {item.available}
                  </p>
                  <p className="mt-1 text-sm text-zinc-100">
                    小計: ¥{(item.price * item.quantity).toLocaleString("ja-JP")}
                  </p>

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
                onClick={onCheckout}
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
