/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { ChangeEvent, useEffect, useRef, useState } from "react"
import { ImageUp } from "lucide-react"
import type { AnalyzeResult, UsageCostSummary } from "@/lib/color-match-types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ImageGenerationCostSummary = {
  model: string
  quality: "low" | "medium" | "high"
  size: string
  images: number
  estimatedUsdPerImage: number
  estimatedUsdTotal: number
}

type ProductContext = {
  id: number
  name: string
  imageUrl: string
  description: string
  price: number
}

type ColorMatchPageClientProps = {
  productContext?: ProductContext
  embedded?: boolean
  hideHeader?: boolean
  embeddedView?: "full" | "upload" | "results"
  onSelfieSelected?: (file: File) => Promise<void> | void
  onAnalysisComplete?: (
    analysis: AnalyzeResult,
    usage: UsageCostSummary | null
  ) => Promise<void> | void
  initialPreviewUrl?: string
  initialAnalysis?: AnalyzeResult | null
  useSavedProfileImageOnly?: boolean
  savedProfileImageUrl?: string | null
  initialGeneratedDesignUrl?: string
  initialGeneratedDesignTitle?: string
  generatedImageLimit?: number
  generatedImageCount?: number
  remainingGenerationCount?: number
}

type ColorMatchEmbeddedSectionProps = Omit<
  ColorMatchPageClientProps,
  "embedded" | "hideHeader" | "embeddedView"
>

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback
  const data = payload as {
    message?: unknown
    detail?: { error?: { message?: unknown } } | unknown
  }
  if (typeof data.detail === "object" && data.detail !== null) {
    const detail = data.detail as { error?: { message?: unknown } }
    if (typeof detail.error?.message === "string" && detail.error.message.trim()) {
      return detail.error.message
    }
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message
  }
  return fallback
}

export function ColorMatchPageClient({
  productContext,
  embedded = false,
  hideHeader = false,
  embeddedView = "full",
  onSelfieSelected,
  onAnalysisComplete,
  initialPreviewUrl = "",
  initialAnalysis = null,
  useSavedProfileImageOnly = false,
  savedProfileImageUrl = null,
  initialGeneratedDesignUrl = "",
  initialGeneratedDesignTitle = "",
  generatedImageLimit = 0,
  generatedImageCount = 0,
  remainingGenerationCount = 0,
}: ColorMatchPageClientProps) {
  const isProductTryOnPage = Boolean(productContext && useSavedProfileImageOnly)
  const isProfileEmbeddedMode = embedded && !productContext
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl)
  const [optimizedImage, setOptimizedImage] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(initialAnalysis)
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0)
  const [generatedDesignUrl, setGeneratedDesignUrl] = useState(initialGeneratedDesignUrl)
  const [generatedDesignTitle, setGeneratedDesignTitle] = useState(initialGeneratedDesignTitle)
  const [designCost, setDesignCost] = useState<ImageGenerationCostSummary | null>(null)
  const [generatedByOutfit, setGeneratedByOutfit] = useState<
    Record<number, { imageUrl: string; title: string; cost: ImageGenerationCostSummary | null }>
  >({})
  const [previewModal, setPreviewModal] = useState<{ src: string; title: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const formatUsd = (value: number) => `$${value.toFixed(6)}`
  const fileInputId = embedded ? `selfie-upload-${embeddedView}` : "selfie-upload"

  useEffect(() => {
    setPreviewUrl(initialPreviewUrl)
  }, [initialPreviewUrl])

  useEffect(() => {
    setAnalysis(initialAnalysis)
  }, [initialAnalysis])

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    void handleUpload(event)
  }

  const compressImageForAnalysis = async (file: File): Promise<File> => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })

    const maxSide = 768
    const scale = Math.min(maxSide / image.width, maxSide / image.height, 1)
    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return file

    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png")
    })

    if (!blob) return file
    return new File([blob], "analysis.png", { type: "image/png" })
  }

  const generateDesignFor = async (
    analysisResult: AnalyzeResult,
    imageFile: File,
    outfitIndex: number
  ) => {
    const cached = generatedByOutfit[outfitIndex]
    if (cached) {
      setGeneratedDesignUrl(cached.imageUrl)
      setGeneratedDesignTitle(cached.title)
      setDesignCost(cached.cost)
      return
    }

    setIsGeneratingDesign(true)
    setErrorMessage("")
    setDesignCost(null)
    try {
      const selectedOutfit = analysisResult.recommendations.outfits?.[outfitIndex]
      if (!selectedOutfit) {
        setErrorMessage("No outfit suggestion found")
        return
      }

      const requestBody = new FormData()
      requestBody.append("image", imageFile)
      requestBody.append("outfit", JSON.stringify(selectedOutfit))

      const response = await fetch("/api/color-match/designs", {
        method: "POST",
        body: requestBody,
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(extractApiErrorMessage(payload, "Failed to generate styled outfit image"))
        return
      }

      const imageDataUrl = typeof payload.imageDataUrl === "string" ? payload.imageDataUrl : ""
      const imageCost = (payload.imageCost ?? null) as ImageGenerationCostSummary | null
      if (!imageDataUrl) {
        setErrorMessage("Generated image is empty")
        return
      }

      const generatedTitle = `${toTitleCase(selectedOutfit.top)} + ${toTitleCase(selectedOutfit.bottom)}`
      setGeneratedByOutfit((previous) => ({
        ...previous,
        [outfitIndex]: {
          imageUrl: imageDataUrl,
          title: generatedTitle,
          cost: imageCost,
        },
      }))
      setGeneratedDesignUrl(imageDataUrl)
      setGeneratedDesignTitle(generatedTitle)
      setDesignCost(imageCost)
    } catch {
      setErrorMessage("Network error while generating styled outfit")
    } finally {
      setIsGeneratingDesign(false)
    }
  }

  const analyzeWithFile = async (file: File, nextPreviewUrl?: string) => {
    setIsAnalyzing(true)
    setErrorMessage("")
    setAnalysis(null)
    setSelectedOutfitIndex(0)
    setGeneratedDesignUrl("")
    setGeneratedDesignTitle("")
    setDesignCost(null)
    setGeneratedByOutfit({})
    setOptimizedImage(null)
    setPreviewUrl(nextPreviewUrl ?? URL.createObjectURL(file))

    try {
      if (onSelfieSelected) {
        await onSelfieSelected(file)
      }

      const optimizedFile = await compressImageForAnalysis(file)
      setOptimizedImage(optimizedFile)
      const requestBody = new FormData()
      requestBody.append("image", optimizedFile)
      const response = await fetch("/api/color-match/analyze", {
        method: "POST",
        body: requestBody,
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(extractApiErrorMessage(payload, "Failed to analyze image"))
        return
      }

      const nextAnalysis = (payload.result ?? null) as AnalyzeResult | null
      const usage = (payload.usage ?? null) as UsageCostSummary | null
      setAnalysis(nextAnalysis)
      setSelectedOutfitIndex(0)
      if (nextAnalysis && onAnalysisComplete) {
        await onAnalysisComplete(nextAnalysis, usage)
      }
      if (!isProfileEmbeddedMode && nextAnalysis?.recommendations.outfits?.length) {
        await generateDesignFor(nextAnalysis, optimizedFile, 0)
      }
    } catch {
      setErrorMessage("Network error while analyzing image")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await analyzeWithFile(file)
  }

  const loadSavedProfileImageFile = async () => {
    if (!savedProfileImageUrl) {
      setErrorMessage("Add your selfie on the profile page first.")
      return null
    }

    try {
      const response = await fetch(savedProfileImageUrl)
      if (!response.ok) {
        setErrorMessage("Failed to load your saved profile image.")
        return null
      }

      const blob = await response.blob()
      const contentType = blob.type || "image/jpeg"
      const extension = contentType.split("/")[1] || "jpg"
      return new File([blob], `profile-selfie.${extension}`, { type: contentType })
    } catch {
      setErrorMessage("Network error while loading your saved profile image.")
      return null
    }
  }

  const analyzeWithSavedProfileImage = async () => {
    const file = await loadSavedProfileImageFile()
    if (!file) return

    await analyzeWithFile(file, savedProfileImageUrl ?? undefined)
  }

  const generateDesign = async () => {
    if (!analysis || !optimizedImage) return
    await generateDesignFor(analysis, optimizedImage, selectedOutfitIndex)
  }

  const generateWithCurrentDress = async (sourceImage?: File) => {
    const imageFile = sourceImage ?? optimizedImage
    if (!imageFile || !productContext) return

    setIsGeneratingDesign(true)
    setErrorMessage("")
    setDesignCost(null)
    try {
      const requestBody = new FormData()
      requestBody.append("mode", "product_context")
      requestBody.append("image", imageFile)
      requestBody.append(
        "productContext",
        JSON.stringify({
          id: productContext.id,
          name: productContext.name,
          description: productContext.description,
          imageUrl: productContext.imageUrl,
        })
      )

      const response = await fetch("/api/color-match/designs", {
        method: "POST",
        body: requestBody,
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(extractApiErrorMessage(payload, "Failed to generate image with current dress"))
        return
      }

      const imageDataUrl = typeof payload.imageDataUrl === "string" ? payload.imageDataUrl : ""
      const imageCost = (payload.imageCost ?? null) as ImageGenerationCostSummary | null
      if (!imageDataUrl) {
        setErrorMessage("Generated image is empty")
        return
      }

      setGeneratedDesignUrl(imageDataUrl)
      setGeneratedDesignTitle(`${productContext.name} - Current Dress`)
      setDesignCost(imageCost)
    } catch {
      setErrorMessage("Network error while generating current dress image")
    } finally {
      setIsGeneratingDesign(false)
    }
  }

  const generateWithSavedProfileImage = async () => {
    const file = await loadSavedProfileImageFile()
    if (!file) return

    setPreviewUrl(savedProfileImageUrl ?? "")
    setOptimizedImage(file)
    await generateWithCurrentDress(file)
  }

  const heading = productContext ? `${productContext.name} - AI Try On` : "Face Tone Color Match"
  const description = productContext
    ? "Upload your selfie and preview AI-styled outfit recommendations for this product."
    : "Upload your selfie and preview recommended color combinations."

  const uploadSection = embedded && embeddedView === "upload" ? (
    <div className="space-y-4">
      {useSavedProfileImageOnly ? (
        <div>
          <p className="text-sm font-medium">Current Profile Image</p>
        </div>
      ) : null}
      <div className="space-y-4">
        {useSavedProfileImageOnly ? (
          <div className="space-y-2">
            <Label htmlFor={fileInputId}>Saved Profile Selfie</Label>
            <p className="text-sm text-muted-foreground">
              Analysis on this page uses the selfie saved in your profile.
            </p>
          </div>
        ) : (
          <Input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="sr-only"
          />
        )}

        {useSavedProfileImageOnly ? (
          <div className="overflow-hidden rounded-xl border bg-muted/30">
            {previewUrl ? (
              <button
                type="button"
                className="w-full"
                onClick={() => setPreviewModal({ src: previewUrl, title: "Selfie Preview" })}
              >
                <img
                  src={previewUrl}
                  alt="Selfie preview"
                  className="h-72 w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Selfie preview will appear here
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative mx-auto flex aspect-square w-full max-w-[20rem] items-center justify-center overflow-hidden rounded-full border bg-muted/30"
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Selfie preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-black/20" />
              </>
            ) : null}
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border bg-background/90">
              <ImageUp className="h-5 w-5" />
            </span>
            <span className="sr-only">Choose image</span>
          </button>
        )}

        {productContext ? (
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              SELECTED PRODUCT
            </p>
            <div className="rounded-lg border p-2">
              <img
                src={productContext.imageUrl}
                alt={productContext.name}
                className="mb-2 h-56 w-full rounded-md object-cover"
              />
              <p className="text-sm font-medium">{productContext.name}</p>
              <p className="text-xs text-muted-foreground">{productContext.description}</p>
              <p className="mt-1 text-sm font-semibold">
                ${productContext.price.toFixed(2)}
              </p>
            </div>
          </div>
        ) : null}

        {isProfileEmbeddedMode ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {useSavedProfileImageOnly ? (
                <Button
                  onClick={() => void analyzeWithSavedProfileImage()}
                  disabled={isAnalyzing || !savedProfileImageUrl}
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : analysis
                      ? "Reanalyze Current Profile Image"
                      : "Analyze with Current Profile Image"}
                </Button>
              ) : (
                isAnalyzing ? <p className="text-sm text-muted-foreground">Analyzing...</p> : null
              )}
              {productContext ? (
                <Button
                  variant="outline"
                  onClick={() => void generateWithCurrentDress()}
                  disabled={!analysis || !optimizedImage || isGeneratingDesign}
                >
                  {isGeneratingDesign ? "Generating..." : "Generate with Current Dress"}
                </Button>
              ) : null}
            </div>

            {productContext ? (
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  GENERATED WITH CURRENT DRESS
                </p>
                {generatedDesignUrl ? (
                  <div className="rounded-lg border p-2">
                    <button
                      type="button"
                      className="w-full"
                      onClick={() =>
                        setPreviewModal({
                          src: generatedDesignUrl,
                          title: generatedDesignTitle || "Generated Outfit",
                        })
                      }
                    >
                      <img
                        src={generatedDesignUrl}
                        alt={generatedDesignTitle || "Generated outfit"}
                        className="mb-2 h-72 w-full rounded-md object-cover"
                      />
                    </button>
                    {generatedDesignTitle ? (
                      <p className="text-sm font-medium">{generatedDesignTitle}</p>
                    ) : null}
                    {designCost ? (
                      <p className="text-xs text-muted-foreground">
                        Estimated image cost: {formatUsd(designCost.estimatedUsdTotal)} (
                        {designCost.model}, {designCost.quality}, {designCost.size})
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Generated image with current dress will appear here
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {useSavedProfileImageOnly ? (
                <Button
                  onClick={() => void analyzeWithSavedProfileImage()}
                  disabled={isAnalyzing || !savedProfileImageUrl}
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : analysis
                      ? "Reanalyze Current Profile Image"
                      : "Analyze with Current Profile Image"}
                </Button>
              ) : (
                isAnalyzing ? <p className="text-sm text-muted-foreground">Analyzing...</p> : null
              )}
              <Button
                variant="outline"
                onClick={() => void generateDesign()}
                disabled={!analysis || !optimizedImage || isGeneratingDesign}
              >
                {isGeneratingDesign ? "Generating..." : "Generate Styled Outfit"}
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">GENERATED OUTFIT</p>
              {generatedDesignUrl ? (
                <div className="rounded-lg border p-2">
                  <button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      setPreviewModal({
                        src: generatedDesignUrl,
                        title: generatedDesignTitle || "Generated Outfit",
                      })
                    }
                  >
                    <img
                      src={generatedDesignUrl}
                      alt={generatedDesignTitle || "Generated outfit"}
                      className="mb-2 h-72 w-full rounded-md object-cover"
                    />
                  </button>
                  {generatedDesignTitle ? (
                    <p className="text-sm font-medium">{generatedDesignTitle}</p>
                  ) : null}
                  {designCost ? (
                    <p className="text-xs text-muted-foreground">
                      Estimated image cost: {formatUsd(designCost.estimatedUsdTotal)} (
                      {designCost.model}, {designCost.quality}, {designCost.size})
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Generated outfit image will appear here
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  ) : (
    <Card>
      {useSavedProfileImageOnly ? (
        <CardHeader>
          <CardTitle>Current Profile Image</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="space-y-4">
        {useSavedProfileImageOnly ? (
          <div className="space-y-2">
            <Label htmlFor={fileInputId}>Saved Profile Selfie</Label>
            <p className="text-sm text-muted-foreground">
              Analysis on this page uses the selfie saved in your profile.
            </p>
          </div>
        ) : (
          <Input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="sr-only"
          />
        )}

        {useSavedProfileImageOnly ? (
          <div className="rounded-xl border bg-muted/30 p-4">
            {previewUrl ? (
              <button
                type="button"
                className="w-full"
                onClick={() => setPreviewModal({ src: previewUrl, title: "Selfie Preview" })}
              >
                <img
                  src={previewUrl}
                  alt="Selfie preview"
                  className="h-72 w-full rounded-lg object-cover"
                />
              </button>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Selfie preview will appear here
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-xl bg-muted/30 p-4"
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Selfie preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-black/20" />
              </>
            ) : null}
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border bg-background/90">
              <ImageUp className="h-5 w-5" />
            </span>
            <span className="sr-only">Choose image</span>
          </button>
        )}

        {productContext ? (
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              SELECTED PRODUCT
            </p>
            <div className="rounded-lg border p-2">
              <img
                src={productContext.imageUrl}
                alt={productContext.name}
                className="mb-2 h-56 w-full rounded-md object-cover"
              />
              <p className="text-sm font-medium">{productContext.name}</p>
              <p className="text-xs text-muted-foreground">{productContext.description}</p>
              <p className="mt-1 text-sm font-semibold">
                ${productContext.price.toFixed(2)}
              </p>
            </div>
          </div>
        ) : null}

        {isProfileEmbeddedMode ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {useSavedProfileImageOnly ? (
                <Button
                  onClick={() => void analyzeWithSavedProfileImage()}
                  disabled={isAnalyzing || !savedProfileImageUrl}
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : analysis
                      ? "Reanalyze Current Profile Image"
                      : "Analyze with Current Profile Image"}
                </Button>
              ) : (
                isAnalyzing ? <p className="text-sm text-muted-foreground">Analyzing...</p> : null
              )}
              {productContext ? (
                <Button
                  variant="outline"
                  onClick={() => void generateWithCurrentDress()}
                  disabled={!analysis || !optimizedImage || isGeneratingDesign}
                >
                  {isGeneratingDesign ? "Generating..." : "Generate with Current Dress"}
                </Button>
              ) : null}
            </div>

            {productContext ? (
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  GENERATED WITH CURRENT DRESS
                </p>
                {generatedDesignUrl ? (
                  <div className="rounded-lg border p-2">
                    <button
                      type="button"
                      className="w-full"
                      onClick={() =>
                        setPreviewModal({
                          src: generatedDesignUrl,
                          title: generatedDesignTitle || "Generated Outfit",
                        })
                      }
                    >
                      <img
                        src={generatedDesignUrl}
                        alt={generatedDesignTitle || "Generated outfit"}
                        className="mb-2 h-72 w-full rounded-md object-cover"
                      />
                    </button>
                    {generatedDesignTitle ? (
                      <p className="text-sm font-medium">{generatedDesignTitle}</p>
                    ) : null}
                    {designCost ? (
                      <p className="text-xs text-muted-foreground">
                        Estimated image cost: {formatUsd(designCost.estimatedUsdTotal)} (
                        {designCost.model}, {designCost.quality}, {designCost.size})
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Generated image with current dress will appear here
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {useSavedProfileImageOnly ? (
                <Button
                  onClick={() => void analyzeWithSavedProfileImage()}
                  disabled={isAnalyzing || !savedProfileImageUrl}
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : analysis
                      ? "Reanalyze Current Profile Image"
                      : "Analyze with Current Profile Image"}
                </Button>
              ) : (
                isAnalyzing ? <p className="text-sm text-muted-foreground">Analyzing...</p> : null
              )}
              <Button
                variant="outline"
                onClick={() => void generateDesign()}
                disabled={!analysis || !optimizedImage || isGeneratingDesign}
              >
                {isGeneratingDesign ? "Generating..." : "Generate Styled Outfit"}
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">GENERATED OUTFIT</p>
              {generatedDesignUrl ? (
                <div className="rounded-lg border p-2">
                  <button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      setPreviewModal({
                        src: generatedDesignUrl,
                        title: generatedDesignTitle || "Generated Outfit",
                      })
                    }
                  >
                    <img
                      src={generatedDesignUrl}
                      alt={generatedDesignTitle || "Generated outfit"}
                      className="mb-2 h-72 w-full rounded-md object-cover"
                    />
                  </button>
                  {generatedDesignTitle ? (
                    <p className="text-sm font-medium">{generatedDesignTitle}</p>
                  ) : null}
                  {designCost ? (
                    <p className="text-xs text-muted-foreground">
                      Estimated image cost: {formatUsd(designCost.estimatedUsdTotal)} (
                      {designCost.model}, {designCost.quality}, {designCost.size})
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Generated outfit image will appear here
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  const resultsSection = (
    <div className="min-w-0 overflow-hidden space-y-5 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10">
      <div>
        <h3 className="text-lg font-medium leading-snug">Style Match</h3>
      </div>
      <div className="space-y-5">
        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">PROFILE</p>
          {analysis ? (
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Gender:</span> {toTitleCase(analysis.gender)}</p>
              <p><span className="font-medium">Face Shape:</span> {toTitleCase(analysis.face_shape)}</p>
              <p><span className="font-medium">Skin Tone:</span> {toTitleCase(analysis.skin_tone)}</p>
              <p><span className="font-medium">Undertone:</span> {toTitleCase(analysis.undertone)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Upload an image to get profile analysis.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">RECOMMENDED COLORS</p>
          {analysis?.recommendations.colors?.length ? (
            <div className="flex flex-wrap gap-2">
              {analysis.recommendations.colors.map((color) => (
                <span key={`${color.name}-${color.hex}`} className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs ring-1 ring-foreground/10">
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: color.hex }}
                  />
                  {toTitleCase(color.name)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No colors yet.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">AVOID COLORS</p>
          {analysis?.recommendations.avoid_colors?.length ? (
            <div className="flex flex-wrap gap-2">
              {analysis.recommendations.avoid_colors.map((color) => (
                <span key={`${color.name}-${color.hex}`} className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs text-destructive ring-1 ring-destructive/20">
                  <span
                    className="h-3 w-3 rounded-full border border-destructive/40"
                    style={{ backgroundColor: color.hex }}
                  />
                  {toTitleCase(color.name)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No avoid list yet.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">CLOTHING STYLE</p>
          {analysis?.recommendations.clothing ? (
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">Neck:</span> {analysis.recommendations.clothing.neck.map(toTitleCase).join(", ")}</p>
              <p><span className="font-medium">Sleeve:</span> {analysis.recommendations.clothing.sleeve.map(toTitleCase).join(", ")}</p>
              <p><span className="font-medium">Fit:</span> {analysis.recommendations.clothing.fit.map(toTitleCase).join(", ")}</p>
              <p><span className="font-medium">Patterns:</span> {analysis.recommendations.clothing.patterns.map(toTitleCase).join(", ")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No style guidance yet.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">OUTFIT SUGGESTIONS</p>
          {analysis?.recommendations.outfits?.length ? (
            <div className="space-y-1 text-xs">
              {analysis.recommendations.outfits.map((item, index) => (
                <button
                  key={`${item.top}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedOutfitIndex(index)
                    if (!isProfileEmbeddedMode) {
                      const cached = generatedByOutfit[index]
                      if (cached) {
                        setGeneratedDesignUrl(cached.imageUrl)
                        setGeneratedDesignTitle(cached.title)
                        setDesignCost(cached.cost)
                      } else if (analysis && optimizedImage) {
                        void generateDesignFor(analysis, optimizedImage, index)
                      }
                    }
                  }}
                  className="block text-left"
                >
                  <span className="font-medium">{toTitleCase(item.top)} + {toTitleCase(item.bottom)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No outfits yet.</p>
          )}
        </div>

        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
    </div>
  )

  if (isProductTryOnPage && productContext) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{productContext.name} Try On</h1>
            <p className="text-sm text-muted-foreground">
              Use your saved profile selfie to preview this product on you.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to Shop
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted/30 p-4">
                {previewUrl ? (
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => setPreviewModal({ src: previewUrl, title: "Profile Image" })}
                  >
                    <img
                      src={previewUrl}
                      alt="Profile image"
                      className="h-80 w-full rounded-lg object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-80 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Save a selfie on your profile page first
                  </div>
                )}
              </div>
              <Button
                onClick={() => void generateWithSavedProfileImage()}
                disabled={isGeneratingDesign || !savedProfileImageUrl || remainingGenerationCount <= 0}
              >
                {isGeneratingDesign ? "Generating..." : "Analyze with Current Profile Image"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Remaining count: {remainingGenerationCount} / {generatedImageLimit}
              </p>
              {!savedProfileImageUrl ? (
                <p className="text-sm text-muted-foreground">
                  Add your selfie on the profile page before using try-on.
                </p>
              ) : null}
              {savedProfileImageUrl && remainingGenerationCount <= 0 ? (
                <p className="text-sm text-destructive">
                  You have used all {generatedImageCount} of {generatedImageLimit} available generations.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-4">
                <img
                  src={productContext.imageUrl}
                  alt={productContext.name}
                  className="mb-3 h-80 w-full rounded-lg object-cover"
                />
                <p className="text-base font-medium">{productContext.name}</p>
                <p className="text-sm text-muted-foreground">{productContext.description}</p>
                <p className="mt-2 text-base font-semibold">${productContext.price.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-4">
                {generatedDesignUrl ? (
                  <button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      setPreviewModal({
                        src: generatedDesignUrl,
                        title: generatedDesignTitle || "Generated Result",
                      })
                    }
                  >
                    <img
                      src={generatedDesignUrl}
                      alt={generatedDesignTitle || "Generated result"}
                      className="mb-3 h-80 w-full rounded-lg object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-80 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Generated try-on image will appear here
                  </div>
                )}
                {generatedDesignTitle ? (
                  <p className="text-sm font-medium">{generatedDesignTitle}</p>
                ) : null}
                {designCost ? (
                  <p className="text-xs text-muted-foreground">
                    Estimated image cost: {formatUsd(designCost.estimatedUsdTotal)} (
                    {designCost.model}, {designCost.quality}, {designCost.size})
                  </p>
                ) : null}
              </div>
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            </CardContent>
          </Card>
        </section>

        <Dialog
          open={Boolean(previewModal)}
          onOpenChange={(open) => {
            if (!open) setPreviewModal(null)
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewModal?.title ?? "Image Preview"}</DialogTitle>
            </DialogHeader>
            {previewModal?.src ? (
              <img
                src={previewModal.src}
                alt={previewModal.title}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className={embedded ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-8"}>
      {embedded && !hideHeader ? (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      ) : !embedded ? (
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to Shop
          </Link>
        </header>
      ) : null}

      {embeddedView === "upload" ? (
        uploadSection
      ) : embeddedView === "results" ? (
        resultsSection
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {uploadSection}
          {resultsSection}
        </section>
      )}

      <Dialog
        open={Boolean(previewModal)}
        onOpenChange={(open) => {
          if (!open) setPreviewModal(null)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewModal?.title ?? "Image Preview"}</DialogTitle>
          </DialogHeader>
          {previewModal?.src ? (
            <img
              src={previewModal.src}
              alt={previewModal.title}
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ColorMatchUploadSection(props: ColorMatchEmbeddedSectionProps) {
  return (
    <ColorMatchPageClient
      {...props}
      embedded
      hideHeader
      embeddedView="upload"
    />
  )
}

export function ColorMatchResultsSection(props: ColorMatchEmbeddedSectionProps) {
  return (
    <ColorMatchPageClient
      {...props}
      embedded
      hideHeader
      embeddedView="results"
    />
  )
}
