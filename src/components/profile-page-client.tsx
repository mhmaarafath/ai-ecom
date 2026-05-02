/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ColorMatchResultsSection,
  ColorMatchUploadSection,
} from "@/components/color-match-page-client"
import type { AnalyzeResult, UsageCostSummary } from "@/lib/color-match-types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type ProfilePageClientProps = {
  user: {
    id: string
    name: string
    mobileNumber: string
    isAdmin: boolean
    profileImageUrl: string | null
    profileAnalysis: AnalyzeResult | null
    profileAnalysisSavedAt: string | null
    createdAt: string
  }
  generatedLooks: Array<{
    id: string
    productId: number
    generatedImageUrl: string
    createdAt: string
    productName: string
    productImageUrl: string
  }>
  generatedImageLimit: number
  generatedImageCount: number
  remainingGenerationCount: number
}

export function ProfilePageClient({
  user,
  generatedLooks,
  generatedImageLimit,
  generatedImageCount,
  remainingGenerationCount,
}: ProfilePageClientProps) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber)
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl)
  const [profileAnalysis, setProfileAnalysis] = useState(user.profileAnalysis)
  const [profileAnalysisSavedAt, setProfileAnalysisSavedAt] = useState(user.profileAnalysisSavedAt)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

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
        user?: ProfilePageClientProps["user"]
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

  const saveProfileImage = async (file: File) => {
    setIsUploadingImage(true)
    setMessage("")
    setIsError(false)

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json()) as {
        message?: string
        user?: ProfilePageClientProps["user"]
      }

      if (!response.ok) {
        setIsError(true)
        setMessage(payload.message ?? "Failed to upload profile image")
        return
      }

      setProfileImageUrl(payload.user?.profileImageUrl ?? null)
      setMessage("Profile selfie saved.")
      router.refresh()
    } catch {
      setIsError(true)
      setMessage("Network error while uploading profile image")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const saveProfileAnalysis = async (
    analysis: AnalyzeResult,
    usage: UsageCostSummary | null
  ) => {
    setMessage("")
    setIsError(false)

    try {
      const response = await fetch("/api/profile/analysis", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          usage,
        }),
      })

      const payload = (await response.json()) as {
        message?: string
        user?: ProfilePageClientProps["user"]
      }

      if (!response.ok) {
        setIsError(true)
        setMessage(payload.message ?? "Failed to save profile analysis")
        return
      }

      setProfileAnalysis(payload.user?.profileAnalysis ?? analysis)
      setProfileAnalysisSavedAt(payload.user?.profileAnalysisSavedAt ?? new Date().toISOString())
      setMessage("Profile analysis saved.")
      router.refresh()
    } catch {
      setIsError(true)
      setMessage("Network error while saving profile analysis")
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account details.
          </p>
        </div>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to Shop
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-3">
          {isUploadingImage ? (
            <p className="text-xs text-muted-foreground">Saving uploaded selfie...</p>
          ) : null}
          <Card>
            <div className="p-4">
              <ColorMatchUploadSection
                onSelfieSelected={saveProfileImage}
                onAnalysisComplete={saveProfileAnalysis}
                initialPreviewUrl={profileImageUrl ?? ""}
                initialAnalysis={profileAnalysis}
              />
            </div>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>
                Update the information used for your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <div className="space-y-3 pt-1 text-sm">
                    <div>
                      <p className="text-muted-foreground">Role</p>
                      <p className="font-medium">{user.isAdmin ? "Admin" : "Customer"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joined</p>
                      <p className="font-medium">{new Date(user.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Saved Analysis</p>
                      <p className="font-medium">
                        {profileAnalysisSavedAt ? new Date(profileAnalysisSavedAt).toLocaleString() : "No analysis saved"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Generated Images Remaining</p>
                      <p className="font-medium">
                        {remainingGenerationCount} / {generatedImageLimit}
                      </p>
                    </div>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 overflow-hidden">
          <ColorMatchResultsSection
            onSelfieSelected={saveProfileImage}
            onAnalysisComplete={saveProfileAnalysis}
            initialPreviewUrl={profileImageUrl ?? ""}
            initialAnalysis={profileAnalysis}
          />
        </div>
      </div>

      <section className="mt-8 border-t pt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">Generated Images</h2>
          <p className="text-sm text-muted-foreground">
            Your saved try-on results across products. Used {generatedImageCount} of {generatedImageLimit}.
          </p>
        </div>

        {generatedLooks.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No generated images yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {generatedLooks.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={item.generatedImageUrl}
                    alt={item.productName}
                    className="h-72 w-full object-cover"
                  />
                  <div className="space-y-2 p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Link
                        href={`/products/${item.productId}`}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        View
                      </Link>
                    </div>
                    {item.productImageUrl ? (
                      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2">
                        <img
                          src={item.productImageUrl}
                          alt={item.productName}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                        <div>
                          <p className="text-xs text-muted-foreground">Product</p>
                          <p className="text-sm font-medium">{item.productName}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
