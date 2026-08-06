import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-key-that-is-at-least-32-characters-long"
)

// Password Hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Token Signing
export async function signAccessJWT(payload: {
  userId: string
  email: string
  roles: string[]
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m") // 15 minutes access token lifespan
    .sign(JWT_SECRET)
}

export async function verifyAccessJWT(
  token: string
): Promise<{ userId: string; email: string; roles: string[] } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      roles: payload.roles as string[],
    }
  } catch (error) {
    return null
  }
}

export async function signRefreshJWT(payload: { sessionId: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 days refresh token lifespan
    .sign(JWT_SECRET)
}

export async function verifyRefreshJWT(
  token: string
): Promise<{ sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sessionId: payload.sessionId as string,
    }
  } catch (error) {
    return null
  }
}

import { NextRequest } from "next/server"

export async function checkCatalogWriteAccess(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null

  const decoded = await verifyAccessJWT(token)
  if (!decoded) return null

  const hasAccess =
    decoded.roles.includes("admin") ||
    decoded.roles.includes("super_admin") ||
    decoded.roles.includes("seller")
  return hasAccess ? decoded : null
}
