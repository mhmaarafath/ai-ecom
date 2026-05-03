"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Shirt, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type UserAuthFormProps = React.ComponentProps<"div"> & {
  initialMode?: "login" | "register"
}

export function UserAuthForm({
  className,
  initialMode = "login",
  ...props
}: UserAuthFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mode = initialMode

  const submitLabel = mode === "register" ? "Create Account" : "Login"
  const title = mode === "register" ? "Create Account" : "User Login"
  const description =
    mode === "register"
      ? "Register with your name and mobile number"
      : "Sign in with your mobile number"

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    try {
      const response = await fetch(
        mode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name,
            mobileNumber,
          }),
        }
      )

      const payload = (await response.json()) as { message?: string }
      if (!response.ok) {
        setMessage(payload.message ?? "Request failed")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setMessage("Network error while submitting the form")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-balance text-muted-foreground">{description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className={buttonVariants({
                    variant: mode === "login" ? "default" : "outline",
                  })}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({
                    variant: mode === "register" ? "default" : "outline",
                  })}
                >
                  Register
                </Link>
              </div>

              {mode === "register" ? (
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor="mobile-number">Mobile Number</FieldLabel>
                <Input
                  id="mobile-number"
                  type="tel"
                  inputMode="tel"
                  placeholder="0771234567"
                  value={mobileNumber}
                  onChange={(event) => setMobileNumber(event.target.value)}
                  required
                />
              </Field>

              {message ? (
                <FieldDescription className="text-destructive">
                  {message}
                </FieldDescription>
              ) : (
                <FieldDescription>
                  {mode === "register"
                    ? "We will create your account and sign you in immediately."
                    : "Use the mobile number you registered with."}
                </FieldDescription>
              )}

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : submitLabel}
                </Button>
              </Field>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:flex md:items-center md:justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="inline-flex size-20 items-center justify-center rounded-full border bg-background text-foreground shadow-sm">
                <Shirt className="size-9" />
              </span>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  AI Ecom
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Sign in to manage your profile, saved looks, and faster try-on access.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
