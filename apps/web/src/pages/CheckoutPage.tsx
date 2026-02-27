import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import type { CartItem } from "../features/catalog/types"
import {
  failedProductIds,
  summarizeCheckoutResults,
  toProcessingLines,
  type CheckoutExecutionResult,
  type CheckoutLineResult,
} from "../features/order/checkoutSummary"

type CheckoutPageProps = {
  cartItems: CartItem[]
  isCheckoutLoading: boolean
  onLogout: () => void
  onRemoveFromCart: (productId: string) => void
  onCartQuantityChange: (productId: string, quantity: number) => void
  onCheckout: (targetProductIds?: string[]) => Promise<CheckoutExecutionResult>
}

function CheckoutPage({
  cartItems,
  isCheckoutLoading,
  onLogout,
  onRemoveFromCart,
  onCartQuantityChange,
  onCheckout,
}: CheckoutPageProps) {
  const navigate = useNavigate()
  const [checkoutResults, setCheckoutResults] = useState<CheckoutLineResult[]>([])
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  const summary = useMemo(() => summarizeCheckoutResults(checkoutResults), [checkoutResults])
  const totalAmount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cartItems],
  )

  const executeCheckout = async (targetProductIds?: string[]) => {
    const targetItems =
      targetProductIds && targetProductIds.length > 0
        ? cartItems.filter((x) => targetProductIds.includes(x.productId))
        : cartItems

    if (targetItems.length === 0) {
      setCheckoutResults([])
      setCheckoutMessage("対象の商品がありません。")
      return
    }

    setCheckoutResults(toProcessingLines(targetItems))
    setCheckoutMessage("注文処理を開始しました。")

    const result = await onCheckout(targetProductIds)
    setCheckoutResults(result.results)
    setCheckoutMessage(result.message)
  }

  const retryFailed = async () => {
    const ids = failedProductIds(checkoutResults)
    await executeCheckout(ids)
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-700/50 bg-zinc-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-zinc-400">Checkout</p>
            <h1 className="text-lg font-semibold text-white">注文手続き</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/products")}>商品一覧へ戻る</Button>
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
          <h2 className="text-base font-semibold text-white">カート内容</h2>

          {cartItems.length === 0 ? (
            <p className="mt-4 rounded-xl border border-zinc-600/45 bg-zinc-900/55 px-4 py-3 text-sm text-zinc-300">
              カートは空です。商品一覧から商品を追加してください。
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <li
                  key={item.productId}
                  className="rounded-xl border border-zinc-600/45 bg-zinc-900/55 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-100">{item.name}</p>
                      <p className="text-sm text-zinc-400">
                        ¥{item.price.toLocaleString("ja-JP")} / 在庫 {item.available}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-zinc-400" htmlFor={`qty-${item.productId}`}>
                        数量
                      </label>
                      <input
                        id={`qty-${item.productId}`}
                        type="number"
                        min={1}
                        max={Math.max(1, item.available)}
                        value={item.quantity}
                        onChange={(event) => onCartQuantityChange(item.productId, Number(event.target.value))}
                        className="w-20 rounded-lg border border-zinc-500/45 bg-zinc-800/70 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-400/60"
                      />
                      <Button variant="ghost" onClick={() => onRemoveFromCart(item.productId)}>
                        削除
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
            <h2 className="text-base font-semibold text-white">注文サマリー</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between text-zinc-300">
                <dt>商品数</dt>
                <dd>{cartItems.length}件</dd>
              </div>
              <div className="flex items-center justify-between text-zinc-100">
                <dt>合計金額</dt>
                <dd className="text-base font-semibold">¥{totalAmount.toLocaleString("ja-JP")}</dd>
              </div>
            </dl>
            <Button
              className="mt-4"
              fullWidth
              variant="primary"
              disabled={cartItems.length === 0 || isCheckoutLoading}
              onClick={() => void executeCheckout()}
            >
              {isCheckoutLoading ? "注文中..." : "注文を確定する"}
            </Button>
          </section>

          {(checkoutMessage || checkoutResults.length > 0) && (
            <section className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-5">
              <h2 className="text-base font-semibold text-white">実行結果</h2>
              {checkoutMessage && <p className="mt-2 text-sm text-zinc-300">{checkoutMessage}</p>}
              {checkoutResults.length > 0 && (
                <>
                  <p className="mt-3 text-xs text-zinc-400">
                    成功 {summary.success} / 失敗 {summary.failed}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {checkoutResults.map((result) => (
                      <li
                        key={`${result.productId}-${result.status}`}
                        className="rounded-lg border border-zinc-600/45 bg-zinc-900/55 px-3 py-2 text-xs text-zinc-200"
                      >
                        <p>{result.name}</p>
                        <p className="text-zinc-400">{result.message}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {summary.failed > 0 && (
                <Button className="mt-3" fullWidth onClick={() => void retryFailed()} disabled={isCheckoutLoading}>
                  失敗分を再試行
                </Button>
              )}
            </section>
          )}
        </aside>
      </div>
    </main>
  )
}

export default CheckoutPage
