"use client"

import React, { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  // View state management
  const [authMode, setAuthMode] = useState<"credentials" | "otp">("credentials")
  const [mfaRequired, setMfaRequired] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code: mfaRequired ? code : undefined, rememberMe }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Login failed")
      }

      if (data.mfaRequired) {
        setMfaRequired(true)
        setSuccess("Password verified. Please enter your MFA code.")
        setLoading(false)
        return
      }

      setSuccess("Welcome back! Redirecting...")
      setTimeout(() => {
        router.push(callbackUrl)
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleRequestOtp = async () => {
    if (!email) {
      setError("Please enter your email address to request an OTP")
      return
    }
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setOtpSent(true)
      setSuccess("OTP sent! Please check your terminal console log.")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, rememberMe }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess("OTP Verified. Redirecting...")
      setTimeout(() => {
        router.push(callbackUrl)
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="font-sans text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Nexora Commerce
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to access your enterprise dashboard
          </p>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Auth Toggle Modes */}
        {!mfaRequired && !otpSent && (
          <div className="mb-6 flex border-b border-gray-100 dark:border-zinc-800">
            <button
              onClick={() => { setAuthMode("credentials"); setError("") }}
              className={`flex-1 pb-3 text-center text-sm font-semibold transition-colors ${
                authMode === "credentials"
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              Credentials
            </button>
            <button
              onClick={() => { setAuthMode("otp"); setError("") }}
              className={`flex-1 pb-3 text-center text-sm font-semibold transition-colors ${
                authMode === "otp"
                  ? "border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              One-Time Password
            </button>
          </div>
        )}

        {/* Google OAuth Button */}
        {!mfaRequired && !otpSent && (
          <a
            href="/api/auth/google"
            className="mb-6 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white font-semibold text-zinc-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.285 1.514-1.14 2.8-2.43 3.655v3.04h3.92c2.29-2.11 3.655-5.213 3.655-8.868z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.92-3.04c-1.08.72-2.47 1.16-4.01 1.16-3.09 0-5.72-2.09-6.65-4.91H1.31v3.13C3.29 20.36 7.38 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.35 14.3C5.1 13.52 4.95 12.68 4.95 11.8c0-.88.15-1.72.4-2.5V6.17H1.31C.47 7.86 0 9.77 0 11.8c0 2.03.47 3.94 1.31 5.63l4.04-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.93 1.19 15.24 0 12 0 7.38 0 3.29 3.64 1.31 7.82l4.04 3.13c.93-2.82 3.56-4.91 6.65-4.91z"
              />
            </svg>
            Continue with Google
          </a>
        )}

        {/* Divider */}
        {!mfaRequired && !otpSent && (
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute inset-0 border-t border-gray-100 dark:border-zinc-800"></div>
            <span className="relative bg-white px-3 text-xs uppercase tracking-wider text-zinc-400 dark:bg-zinc-900">
              Or continue with
            </span>
          </div>
        )}

        {/* 1. Standard Credentials Form */}
        {authMode === "credentials" && !mfaRequired && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Password
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Forgot Password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 py-1">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-zinc-600 dark:text-zinc-450">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        )}

        {/* 2. OTP Form */}
        {authMode === "otp" && !otpSent && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Sending..." : "Request Login Code"}
            </button>
          </div>
        )}

        {/* 3. OTP Code Verification Page */}
        {authMode === "otp" && otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We have sent a login code to <strong>{email}</strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                One-Time Login Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm tracking-widest focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-center text-xs text-zinc-500 hover:underline"
            >
              Change Email
            </button>
          </form>
        )}

        {/* 4. MFA Code Verification Page */}
        {mfaRequired && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                MFA Authenticator Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., 000000"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Validating..." : "Submit Code"}
            </button>
          </form>
        )}

        {/* Registration Redirection Footer */}
        <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don't have an account?{" "}
          <a
            href="/auth/register"
            className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Sign up now
          </a>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading authentication context...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

