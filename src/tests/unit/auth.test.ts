import { hashPassword, verifyPassword, signAccessJWT, verifyAccessJWT } from "@/lib/auth"

describe("Authentication Utility Unit Tests", () => {
  const mockPassword = "SecurePass123!"
  const mockUserPayload = {
    userId: "user-uuid-12345",
    email: "test@example.com",
    roles: ["customer"],
  }

  // 1. Password hashing test
  it("should hash password and successfully verify matches", async () => {
    const hashed = await hashPassword(mockPassword)
    expect(hashed).toBeDefined()
    expect(hashed).not.toEqual(mockPassword)

    const isMatch = await verifyPassword(mockPassword, hashed)
    expect(isMatch).toBe(true)

    const isFail = await verifyPassword("WrongPassword", hashed)
    expect(isFail).toBe(false)
  })

  // 2. JWT signature tests
  it("should sign and verify access token payloads successfully", async () => {
    const token = await signAccessJWT(mockUserPayload)
    expect(token).toBeDefined()
    expect(typeof token).toBe("string")

    const decoded = await verifyAccessJWT(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.userId).toEqual(mockUserPayload.userId)
    expect(decoded?.email).toEqual(mockUserPayload.email)
    expect(decoded?.roles).toContain("customer")
  })

  // 3. JWT tampering checks
  it("should fail validation for expired or tampered access tokens", async () => {
    const tamperedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"
    const decoded = await verifyAccessJWT(tamperedToken)
    expect(decoded).toBeNull()
  })
})
