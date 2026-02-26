import type { FormEvent } from "react"
import LoginAlerts from "./LoginAlerts"
import LoginFooterHints from "./LoginFooterHints"
import Button from "../ui/Button"

type LoginFormProps = {
  email: string
  password: string
  status: "idle" | "loading" | "success" | "error"
  errorMessage: string | null
  tokenPreview: string | null
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  adminEmail: string
  userEmail: string
}

function LoginForm({
  email,
  password,
  status,
  errorMessage,
  tokenPreview,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  adminEmail,
  userEmail,
}: LoginFormProps) {
  return (
    <section className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-600/40 bg-zinc-800/55 p-8 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">ログイン</h2>
        <p className="text-sm text-zinc-300/90">
          JWT を発行し、Catalog / Order のAPI呼び出しに使います。
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-zinc-200" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-500/40 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-400/60 focus:ring-2 focus:ring-zinc-400/20"
            placeholder="admin@test.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-200" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="w-full rounded-xl border border-zinc-500/40 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-400/60 focus:ring-2 focus:ring-zinc-400/20"
            placeholder="password"
          />
        </div>

        <LoginAlerts status={status} errorMessage={errorMessage} tokenPreview={tokenPreview} />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={status === "loading"}>
          {status === "loading" ? "ログイン中..." : "ログインする"}
        </Button>
      </form>

      <LoginFooterHints adminEmail={adminEmail} userEmail={userEmail} />
    </section>
  )
}

export default LoginForm
