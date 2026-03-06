import { describe, expect, it } from "vitest"
import { getRoleFromJwt } from "./tokenRole"

function createJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

describe("tokenRole", () => {
  it("returns role from role claim", () => {
    const token = createJwt({ role: "admin" })
    expect(getRoleFromJwt(token)).toBe("admin")
  })

  it("returns role from ClaimTypes role URI", () => {
    const token = createJwt({
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "user",
    })
    expect(getRoleFromJwt(token)).toBe("user")
  })

  it("returns null for invalid token", () => {
    expect(getRoleFromJwt("invalid-token")).toBeNull()
  })
})
