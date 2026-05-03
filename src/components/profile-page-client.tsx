"use client"

import { useState } from "react"
import type { CustomerUser } from "@/lib/customer-auth"
import type { AnalyzeResult } from "@/lib/color-match-types"
import { GeneratedLooksSection } from "@/components/generated-looks-section"
import { ProfileAccountDetailsSection } from "@/components/profile-account-details-section"
import { ProfileAnalysisResultsSection } from "@/components/profile-analysis-results-section"
import { ProfileImageAnalysisSection } from "@/components/profile-image-analysis-section"
import { Card } from "@/components/ui/card"

type GeneratedLook = {
  id: string
  productId: number
  generatedImageUrl: string
  createdAt: string
  productName: string
  productImageUrl: string
}

type ProfilePageClientProps = {
  user: CustomerUser
  generatedLooks: GeneratedLook[]
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
  const [profileImageUrl, setProfileImageUrl] = useState(user.profileImageUrl)
  const [profileAnalysis, setProfileAnalysis] = useState<AnalyzeResult | null>(user.profileAnalysis)
  const [profileAnalysisSavedAt, setProfileAnalysisSavedAt] = useState(user.profileAnalysisSavedAt)

  const handleProfileUpdated = (payload: {
    profileImageUrl: string | null
    profileAnalysis: AnalyzeResult | null
    profileAnalysisSavedAt: string | null
  }) => {
    setProfileImageUrl(payload.profileImageUrl)
    setProfileAnalysis(payload.profileAnalysis)
    setProfileAnalysisSavedAt(payload.profileAnalysisSavedAt)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Member since</p>
              <p className="mt-2 text-base font-semibold">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Images remaining</p>
              <p className="mt-2 text-base font-semibold">
                {remainingGenerationCount} / {generatedImageLimit}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Saved looks</p>
              <p className="mt-2 text-base font-semibold">{generatedImageCount}</p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold tracking-tight">Profile Setup</h2>
              <p className="text-sm text-muted-foreground">
                Keep your selfie and account details updated for better try-on results.
              </p>
            </div>
            <div className="flex w-full justify-center px-5 pt-5">
              <ProfileImageAnalysisSection
                initialProfileImageUrl={profileImageUrl}
                initialAnalysis={profileAnalysis}
                onProfileUpdated={handleProfileUpdated}
              />
            </div>
            <ProfileAccountDetailsSection
              user={user}
              profileAnalysisSavedAt={profileAnalysisSavedAt}
              generatedImageLimit={generatedImageLimit}
              remainingGenerationCount={remainingGenerationCount}
            />
          </Card>
        </div>

        <div className="min-w-0">
          <ProfileAnalysisResultsSection analysis={profileAnalysis} />
        </div>
      </section>

      <GeneratedLooksSection
        generatedLooks={generatedLooks}
        generatedImageCount={generatedImageCount}
        generatedImageLimit={generatedImageLimit}
      />
    </main>
  )
}
