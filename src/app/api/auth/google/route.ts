import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // Redirect directly to the callback endpoint with a mock oauth authorization code to simulate a successful consent redirection loop.
  const callbackUrl = new URL("/api/auth/google/callback?code=mock-google-auth-code-12345", req.url)
  return NextResponse.redirect(callbackUrl)
}
