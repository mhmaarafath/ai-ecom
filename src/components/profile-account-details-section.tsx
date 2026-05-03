"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { CustomerUser } from "@/lib/customer-auth"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type ProfileAccountDetailsSectionProps = {
  user: CustomerUser
  profileAnalysisSavedAt: string | null
  generatedImageLimit: number
  remainingGenerationCount: number
}

export function ProfileAccountDetailsSection({
  user,
  profileAnalysisSavedAt,
  generatedImageLimit,
  remainingGenerationCount,
}: ProfileAccountDetailsSectionProps) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setMessage("")
    setIsError(false)

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          mobileNumber,
        }),
      })

      const payload = (await response.json()) as {
        message?: string
        user?: CustomerUser
      }

      if (!response.ok) {
        setIsError(true)
        setMessage(payload.message ?? "Failed to update profile")
        return
      }

      setName(payload.user?.name ?? name)
      setMobileNumber(payload.user?.mobileNumber ?? mobileNumber)
      setMessage("Profile updated.")
      router.refresh()
    } catch {
      setIsError(true)
      setMessage("Network error while updating profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
        <CardDescription>
          Update the information used for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="profile-name">Name</FieldLabel>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-mobile">Mobile Number</FieldLabel>
              <Input
                id="profile-mobile"
                type="tel"
                inputMode="tel"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                placeholder="0771234567"
                required
              />
            </Field>
            {message ? (
              <FieldDescription className={isError ? "text-destructive" : "text-foreground"}>
                {message}
              </FieldDescription>
            ) : null}
            <Field>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </Field>
          </FieldGroup>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="text-muted-foreground">Role</p>
            <p className="mt-1 font-medium">{user.isAdmin ? "Admin" : "Customer"}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="text-muted-foreground">Joined</p>
            <p className="mt-1 font-medium">{new Date(user.createdAt).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="text-muted-foreground">Saved Analysis</p>
            <p className="mt-1 font-medium">
              {profileAnalysisSavedAt ? new Date(profileAnalysisSavedAt).toLocaleString() : "No analysis saved"}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <p className="text-muted-foreground">Generated Images Remaining</p>
            <p className="mt-1 font-medium">
              {remainingGenerationCount} / {generatedImageLimit}
            </p>
          </div>
        </div>
      </CardContent>
    </>
  )
}
