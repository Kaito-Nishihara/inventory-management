type LoginFooterHintsProps = {
  adminEmail: string
  userEmail: string
}

function LoginFooterHints({ adminEmail, userEmail }: LoginFooterHintsProps) {
  return (
    <div className="mt-6 space-y-2 rounded-2xl border border-zinc-700/50 bg-zinc-950/80 p-4 text-xs text-zinc-300">
      <p className="text-zinc-200">デモ用ログイン</p>
      <div className="flex items-center justify-between">
        <span>{adminEmail} / password</span>
        <span className="rounded-full border border-zinc-700/50 bg-zinc-900/70 px-2 py-0.5 text-[10px] uppercase">
          admin
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>{userEmail} / password</span>
        <span className="rounded-full border border-zinc-700/50 bg-zinc-900/70 px-2 py-0.5 text-[10px] uppercase">
          user
        </span>
      </div>
    </div>
  )
}

export default LoginFooterHints
