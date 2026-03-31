import type { Metadata } from "next"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Login",
  description: "Admin login page for AI Ecom dashboard access.",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="mb-4 w-full max-w-sm md:max-w-4xl">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Visit Website
        </Link>
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
