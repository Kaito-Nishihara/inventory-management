type LoginAlertsProps = {
  status: "idle" | "loading" | "success" | "error"
  errorMessage: string | null
  tokenPreview: string | null
}

function LoginAlerts({ status, errorMessage, tokenPreview }: LoginAlertsProps) {
  return (
    <>
      {status === "error" && errorMessage && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {status === "success" && tokenPreview && (
        <div className="rounded-xl border border-zinc-600/70 bg-zinc-800/70 px-4 py-3 text-sm text-zinc-100">
          ログイン成功。JWT を保存しました。
          <div className="mt-2 text-xs text-zinc-300">Preview: {tokenPreview}</div>
        </div>
      )}
    </>
  )
}

export default LoginAlerts
