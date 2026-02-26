import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "neutral" | "primary" | "danger" | "ghost"
type ButtonSize = "sm" | "md" | "lg" | "icon"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children?: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  neutral:
    "border border-zinc-500/50 bg-zinc-700/45 text-zinc-100 hover:bg-zinc-700/65",
  primary: "bg-zinc-300 text-zinc-900 hover:bg-zinc-200",
  danger: "border border-red-500/40 bg-red-950/40 text-red-200 hover:bg-red-900/50",
  ghost: "bg-transparent text-zinc-100 hover:bg-zinc-700/65",
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-4 py-3 text-sm rounded-xl",
  icon: "p-2 rounded-lg",
}

function Button({
  variant = "neutral",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const widthClass = fullWidth ? "w-full" : ""
  const composed = [
    "inline-flex items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    widthClass,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <button type={type} className={composed} {...props}>
      {children}
    </button>
  )
}

export default Button
