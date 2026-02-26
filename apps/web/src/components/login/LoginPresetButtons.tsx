import Button from "../ui/Button"

type LoginPresetButtonsProps = {
  onSelect: (role: "admin" | "user") => void
}

function LoginPresetButtons({ onSelect }: LoginPresetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => onSelect("admin")}
        className="rounded-full"
      >
        管理者アカウントを入力
      </Button>
      <Button
        onClick={() => onSelect("user")}
        className="rounded-full"
      >
        ユーザーアカウントを入力
      </Button>
    </div>
  )
}

export default LoginPresetButtons
