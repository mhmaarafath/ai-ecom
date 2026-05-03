/* eslint-disable @next/next/no-img-element */
"use client"

import { ChangeEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImageUp } from "lucide-react"
import type { AnalyzeResult, UsageCostSummary } from "@/lib/color-match-types"
import {
  compressImageForAnalysis,
  extractApiErrorMessage,
} from "@/lib/color-match-client-utils"

type ProfileImageAnalysisSectionProps = {
  initialProfileImageUrl?: string | null
  initialAnalysis?: AnalyzeResult | null
  onProfileUpdated?: (payload: {
    profileImageUrl: string | null
    profileAnalysis: AnalyzeResult | null
    profileAnalysisSavedAt: string | null
  }) => void
}

type ProfilePhotoResponse = {
  message?: string
  user?: {
    profileImageUrl?: string | null
    profileAnalysis?: AnalyzeResult | null
    profileAnalysisSavedAt?: string | null
  }
}

type ProfileAnalysisResponse = {
  message?: string
  user?: {
    profileImageUrl?: string | null
    profileAnalysis?: AnalyzeResult | null
    profileAnalysisSavedAt?: string | null
  }
}

export function ProfileImageAnalysisSection({
  initialProfileImageUrl = null,
  initialAnalysis = null,
  onProfileUpdated,
}: ProfileImageAnalysisSectionProps) {
  const router = useRouter()
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(initialAnalysis)
  const [statusMessage, setStatusMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [imageLoadError, setImageLoadError] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const displayPreviewUrl = uploadedPreviewUrl ?? initialProfileImageUrl ?? ""

  useEffect(() => {
    setUploadedPreviewUrl(null)
    setImageLoadError("")
  }, [initialProfileImageUrl])

  useEffect(() => {
    setAnalysis(initialAnalysis)
  }, [initialAnalysis])

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    let shouldRefresh = false
    setIsProcessing(true)
    setErrorMessage("")
    setStatusMessage("Uploading and analyzing...")

    try {
      const photoForm = new FormData()
      photoForm.append("image", file)

      const photoResponse = await fetch("/api/profile/photo", {
        method: "POST",
        body: photoForm,
      })
      const photoPayload = (await photoResponse.json()) as ProfilePhotoResponse

      if (!photoResponse.ok) {
        setErrorMessage(extractApiErrorMessage(photoPayload, "Failed to upload profile image"))
        setStatusMessage("")
        return
      }

      const nextProfileImageUrl = photoPayload.user?.profileImageUrl ?? ""
      shouldRefresh = true
      setUploadedPreviewUrl(nextProfileImageUrl || null)
      setImageLoadError("")
      onProfileUpdated?.({
        profileImageUrl: nextProfileImageUrl || null,
        profileAnalysis: photoPayload.user?.profileAnalysis ?? analysis,
        profileAnalysisSavedAt: photoPayload.user?.profileAnalysisSavedAt ?? null,
      })

      const optimizedFile = await compressImageForAnalysis(file)
      const analyzeForm = new FormData()
      analyzeForm.append("image", optimizedFile)

      const analyzeResponse = await fetch("/api/profile/analyze", {
        method: "POST",
        body: analyzeForm,
      })
      const analyzePayload = (await analyzeResponse.json()) as {
        message?: string
        result?: AnalyzeResult | null
        usage?: UsageCostSummary | null
      }

      if (!analyzeResponse.ok || !analyzePayload.result) {
        setErrorMessage(extractApiErrorMessage(analyzePayload, "Failed to analyze image"))
        setStatusMessage("Profile selfie saved.")
        return
      }

      const saveAnalysisResponse = await fetch("/api/profile/analysis", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          analysis: analyzePayload.result,
          usage: analyzePayload.usage ?? null,
        }),
      })
      const saveAnalysisPayload = (await saveAnalysisResponse.json()) as ProfileAnalysisResponse

      if (!saveAnalysisResponse.ok) {
        setAnalysis(analyzePayload.result)
        setErrorMessage(extractApiErrorMessage(saveAnalysisPayload, "Failed to save profile analysis"))
        setStatusMessage("Profile selfie saved.")
        onProfileUpdated?.({
          profileImageUrl: nextProfileImageUrl || null,
          profileAnalysis: analyzePayload.result,
          profileAnalysisSavedAt: null,
        })
        return
      }

      const nextAnalysis = saveAnalysisPayload.user?.profileAnalysis ?? analyzePayload.result
      const nextSavedAt = saveAnalysisPayload.user?.profileAnalysisSavedAt ?? null
      setAnalysis(nextAnalysis)
      setStatusMessage("Profile selfie and analysis saved.")
      onProfileUpdated?.({
        profileImageUrl: nextProfileImageUrl || null,
        profileAnalysis: nextAnalysis,
        profileAnalysisSavedAt: nextSavedAt,
      })
    } catch {
      setErrorMessage("Network error while updating your profile selfie")
      setStatusMessage("")
    } finally {
      setIsProcessing(false)
      if (shouldRefresh) {
        router.refresh()
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        id="profile-selfie-upload"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative mx-auto flex aspect-square w-full max-w-[18rem] items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted/30 shadow-sm ring-1 ring-foreground/10"
      >
        {displayPreviewUrl && !imageLoadError ? (
          <>
            <img
              src={displayPreviewUrl}
              alt="Profile selfie"
              className="absolute inset-0 h-full w-full object-cover"
              onLoad={() => setImageLoadError("")}
              onError={() => setImageLoadError("Failed to load saved profile image.")}
            />
            <span className="absolute inset-0 bg-black/15" />
          </>
        ) : null}
        <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border bg-background/90 shadow-sm">
          <ImageUp className="h-5 w-5" />
        </span>
        <span className="sr-only">Choose profile image</span>
      </button>

      <div className="space-y-2 text-center">
        <p className="text-sm font-medium">Profile Selfie</p>
        <p className="text-sm text-muted-foreground">
          Upload a clear front-facing photo to save your profile and refresh style analysis.
        </p>
      </div>

      {isProcessing ? <p className="text-center text-sm text-muted-foreground">Uploading and analyzing...</p> : null}
      {!isProcessing && statusMessage ? <p className="text-center text-sm text-muted-foreground">{statusMessage}</p> : null}
      {imageLoadError ? <p className="text-center text-sm text-destructive">{imageLoadError}</p> : null}
      {errorMessage ? <p className="text-center text-sm text-destructive">{errorMessage}</p> : null}
      {!analysis && !statusMessage && !errorMessage && !imageLoadError ? (
        <p className="text-center text-sm text-muted-foreground">Upload your selfie to save your profile match.</p>
      ) : null}
    </div>
  )
}
