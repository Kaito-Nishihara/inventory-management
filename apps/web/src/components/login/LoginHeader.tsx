type LoginHeaderProps = {
  identityBaseUrl: string
}

function LoginHeader({ identityBaseUrl }: LoginHeaderProps) {
  return (
    <section className="relative z-10 flex-1 space-y-6">
      <p className="inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-zinc-900/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-zinc-200">
        Inventory Platform
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        物流と在庫の判断を、速く正確に。
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-zinc-300">
        Identity Service の JWT を使ってログインし、Catalog / Order API に安全にアクセスします。
        まずはログインしてトークンを取得してください。
      </p>
      <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
        <span className="rounded-full border border-zinc-700/50 bg-zinc-900/60 px-3 py-1">
          Identity API: {identityBaseUrl}
        </span>
        <span className="rounded-full border border-zinc-700/50 bg-zinc-900/60 px-3 py-1">
          Token 保存先: localStorage
        </span>
      </div>
    </section>
  )
}

export default LoginHeader
