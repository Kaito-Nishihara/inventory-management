type LoginPresetButtonsProps = {
  onSelect: (role: "admin" | "user") => void
}

function LoginPresetButtons({ onSelect }: LoginPresetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20"
        onClick={() => onSelect("admin")}
        type="button"
      >
        管理者アカウントを入力
      </button>
      <button
        className="rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm text-sky-200 transition hover:bg-sky-400/20"
        onClick={() => onSelect("user")}
        type="button"
      >
        ユーザーアカウントを入力
      </button>
    </div>
  )
}

export default LoginPresetButtons
