type LoginAlertsProps = {
  status: "idle" | "loading" | "success" | "error"
  errorMessage: string | null
  tokenPreview: string | null
}

function LoginAlerts({ status, errorMessage, tokenPreview }: LoginAlertsProps) {
  return (
    <>
      {status === "error" && errorMessage && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}

      {status === "success" && tokenPreview && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          ログイン成功。JWT を保存しました。
          <div className="mt-2 text-xs text-emerald-200">Preview: {tokenPreview}</div>
        </div>
      )}
    </>
  )
}

export default LoginAlerts
