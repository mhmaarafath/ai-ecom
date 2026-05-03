"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (username === "admin" && password === "admin") {
      setError("")
      router.push("/admin/dashboard")
      return
    }
    setError("Invalid credentials. Use admin / admin.")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Log in to the admin panel
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="admin"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </Field>
              {error ? (
                <FieldDescription className="text-destructive">
                  {error}
                </FieldDescription>
              ) : null}
              <Field>
                <Button type="submit">Login</Button>
              </Field>
              <FieldDescription className="text-center text-xs">
                Demo login: <span className="font-medium">admin / admin</span>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:flex md:items-center md:justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="inline-flex size-20 items-center justify-center rounded-full border bg-background text-foreground shadow-sm">
                <Shield className="size-9" />
              </span>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  Admin Access
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Sign in to manage products, costs, and the admin dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
