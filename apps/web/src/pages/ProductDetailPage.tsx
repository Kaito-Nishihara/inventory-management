import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import Button from "../components/ui/Button"
import type { ProductResponse } from "../features/catalog/types"

type ProductDetailPageProps = {
  onLogout: () => void
  onAddToCart: (product: ProductResponse) => void
  fetchProductById: (productId: string) => Promise<ProductResponse>
}

function ProductDetailPage({ onLogout, onAddToCart, fetchProductById }: ProductDetailPageProps) {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [product, setProduct] = useState<ProductResponse | null>(null)
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => searchParams.toString(), [searchParams])
  const isProductIdMissing = !productId

  useEffect(() => {
    if (isProductIdMissing) {
      return
    }

    const run = async () => {
      setStatus("loading")
      setError(null)

      try {
        const data = await fetchProductById(productId)
        setProduct(data)
        setStatus("success")
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "商品詳細の取得に失敗しました。")
      }
    }

    void run()
  }, [fetchProductById, isProductIdMissing, productId])

  const goProducts = () => {
    navigate(`/products${query ? `?${query}` : ""}`)
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-700/50 bg-zinc-900/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-white">商品詳細</h1>
          <div className="flex items-center gap-2">
            <Button onClick={goProducts}>一覧へ戻る</Button>
            <Button onClick={onLogout} variant="ghost">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {status === "loading" && (
          <div className="rounded-xl border border-zinc-600/45 bg-zinc-800/55 px-4 py-3 text-sm text-zinc-200">
            商品詳細を読み込み中...
          </div>
        )}

        {status === "error" && error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {isProductIdMissing && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            商品IDが指定されていません。
          </div>
        )}

        {status === "success" && product && (
          <article className="rounded-2xl border border-zinc-600/45 bg-zinc-800/55 p-6 shadow-lg shadow-black/20">
            <h2 className="text-2xl font-semibold text-white">{product.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">カテゴリ: {product.categoryName}</p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{product.description}</p>

            <div className="mt-6 grid gap-3 text-sm text-zinc-200 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-600/45 bg-zinc-900/50 p-4">
                <p className="text-zinc-400">価格</p>
                <p className="mt-1 text-xl font-semibold text-white">¥{product.price.toLocaleString("ja-JP")}</p>
              </div>
              <div className="rounded-xl border border-zinc-600/45 bg-zinc-900/50 p-4">
                <p className="text-zinc-400">販売可能在庫</p>
                <p className="mt-1 text-xl font-semibold text-white">{product.available}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                onClick={() => onAddToCart(product)}
                disabled={product.available <= 0}
                variant="primary"
              >
                {product.available <= 0 ? "在庫なし" : "カートに追加"}
              </Button>
              <Button onClick={goProducts}>一覧へ戻る</Button>
            </div>
          </article>
        )}
      </div>
    </main>
  )
}

export default ProductDetailPage
