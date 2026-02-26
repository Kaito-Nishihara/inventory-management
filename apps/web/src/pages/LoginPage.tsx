import type { FormEvent } from "react"
import LoginForm from "../components/login/LoginForm"
import LoginHeader from "../components/login/LoginHeader"
import LoginPresetButtons from "../components/login/LoginPresetButtons"

type LoginStatus = "idle" | "loading" | "success" | "error"

type LoginPageProps = {
  identityBaseUrl: string
  email: string
  password: string
  status: LoginStatus
  error: string | null
  tokenPreview: string | null
  adminEmail: string
  userEmail: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onPreset: (role: "admin" | "user") => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function LoginPage({
  identityBaseUrl,
  email,
  password,
  status,
  error,
  tokenPreview,
  adminEmail,
  userEmail,
  onEmailChange,
  onPasswordChange,
  onPreset,
  onSubmit,
}: LoginPageProps) {
  return (
    <main className="min-h-screen bg-zinc-900 text-zinc-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-zinc-500/15 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-stone-500/15 blur-[140px]" />
          <div className="absolute left-1/3 top-0 h-px w-full bg-gradient-to-r from-transparent via-zinc-300/20 to-transparent" />
        </div>

        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="flex flex-col gap-6 lg:flex-1">
            <LoginHeader identityBaseUrl={identityBaseUrl} />
            <LoginPresetButtons onSelect={onPreset} />
          </div>

          <LoginForm
            email={email}
            password={password}
            status={status}
            errorMessage={error}
            tokenPreview={tokenPreview}
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onSubmit={onSubmit}
            adminEmail={adminEmail}
            userEmail={userEmail}
          />
        </div>
      </div>
    </main>
  )
}

export default LoginPage
