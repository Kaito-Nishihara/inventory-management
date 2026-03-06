const ROLE_CLAIM_URI = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
  return atob(`${normalized}${padding}`)
}

/**
 * JWTからロールを抽出します。
 */
export function getRoleFromJwt(token: string | null): string | null {
  if (!token) return null

  try {
    const [, payload] = token.split(".")
    if (!payload) return null
    const json = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>

    const role =
      (typeof json.role === "string" ? json.role : null) ??
      (typeof json[ROLE_CLAIM_URI] === "string" ? (json[ROLE_CLAIM_URI] as string) : null)

    if (role) return role

    const roles = json.roles
    if (Array.isArray(roles) && typeof roles[0] === "string") {
      return roles[0]
    }

    return null
  } catch {
    return null
  }
}
