import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { UserAuthForm } from "@/components/user-auth-form"
import { getCurrentCustomerUser } from "@/lib/customer-auth"

export const metadata: Metadata = {
  title: "Login",
  description: "Customer login and registration page for AI Ecom.",
}

export default async function LoginPage() {
  const user = await getCurrentCustomerUser()

  if (user) {
    redirect("/")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="mb-4 w-full max-w-sm md:max-w-4xl">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-all hover:bg-muted"
          >
            Visit Website
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-all hover:bg-muted"
          >
            Admin Login
          </Link>
        </div>
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <UserAuthForm />
      </div>
    </div>
  )
}
