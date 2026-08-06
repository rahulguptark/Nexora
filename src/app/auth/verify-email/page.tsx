"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [code, setCode] = useState(searchParams.get("code") || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const triggerVerification = async (verifyEmail: string, verifyCode: string) => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(
        `/api/auth/verify-email?email=${encodeURIComponent(verifyEmail)}&code=${encodeURIComponent(verifyCode)}`,
        { method: "GET" }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Verification failed")
      }

      setSuccess("Account successfully verified and activated! Redirecting to login...")
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Auto-verification check on mount if both params are present
  useEffect(() => {
    const emailParam = searchParams.get("email")
    const codeParam = searchParams.get("code")
    if (emailParam && codeParam) {
      triggerVerification(emailParam, codeParam)
    }
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code) {
      setError("Please fill in both fields")
      return
    }
    triggerVerification(email, code)
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      
      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Verify Account
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Enter the 6-digit OTP code to activate your account
        </p>
      </div>

      {/* Feedback Alerts */}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Verification Code (OTP)
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
      </form>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Need to register?{" "}
        <a
          href="/auth/register"
          className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Create an account
        </a>
      </div>

    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-zinc-950">
      <Suspense fallback={
        <div className="w-full max-w-md text-center py-12 text-zinc-500">
          Loading verification context...
        </div>
      }>
        <VerifyEmailForm />
      </Suspense>
    </div>
  )
}
