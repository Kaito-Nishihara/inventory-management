import { useMemo, useState, type FormEvent } from "react"
import { postAuthLogin, type LoginRequest, type PostAuthLoginResponse } from "./api/identity"
import { client } from "./api/identity/client.gen"
import LoginForm from "./components/login/LoginForm"
import LoginHeader from "./components/login/LoginHeader"
import LoginPresetButtons from "./components/login/LoginPresetButtons"

type LoginResponse = PostAuthLoginResponse

type LoginStatus = "idle" | "loading" | "success" | "error"

const ADMIN_EMAIL = "admin@test.com"
const USER_EMAIL = "user@test.com"

function App() {
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState("password")
  const [status, setStatus] = useState<LoginStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [tokenPreview, setTokenPreview] = useState<string | null>(null)

  const identityBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_IDENTITY_API_BASE as string | undefined
    return envUrl ?? "http://localhost:5001"
  }, [])

  const handlePreset = (role: "admin" | "user") => {
    setEmail(role === "admin" ? ADMIN_EMAIL : USER_EMAIL)
    setPassword("password")
    setStatus("idle")
    setError(null)
    setTokenPreview(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setError(null)
    setTokenPreview(null)

    try {
      client.setConfig({ baseUrl: identityBaseUrl })

      const loginBody: LoginRequest = { email, password }
      const { data, error: responseError, response } = await postAuthLogin({
        body: loginBody,
      })

      if (response?.status === 401) {
        throw new Error("メールアドレスまたはパスワードが正しくありません。")
      }

      if (!response?.ok) {
        console.error("Login failed:", { response, responseError })
        throw new Error(`ログインに失敗しました (${response?.status ?? "unknown"})`)
      }

      if (responseError) {
        throw new Error("ログインに失敗しました。")
      }

      const loginResponse = data as LoginResponse | undefined
      if (!loginResponse?.accessToken) {
        throw new Error("トークンが取得できませんでした。")
      }

      localStorage.setItem("inventory.jwt", loginResponse.accessToken)
      setTokenPreview(
        `${loginResponse.accessToken.slice(0, 22)}...${loginResponse.accessToken.slice(-18)}`,
      )
      setStatus("success")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました。")
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-[140px]" />
          <div className="absolute left-1/3 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="flex flex-col gap-6 lg:flex-1">
            <LoginHeader identityBaseUrl={identityBaseUrl} />
            <LoginPresetButtons onSelect={handlePreset} />
          </div>

          <LoginForm
            email={email}
            password={password}
            status={status}
            errorMessage={error}
            tokenPreview={tokenPreview}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            adminEmail={ADMIN_EMAIL}
            userEmail={USER_EMAIL}
          />
        </div>
      </div>
    </main>
  )
}

export default App
