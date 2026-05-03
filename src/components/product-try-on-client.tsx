/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import { LoaderCircle, Sparkles, Shirt } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  type ImageGenerationCostSummary,
  extractApiErrorMessage,
  loadRemoteImageAsFile,
} from "@/lib/color-match-client-utils"

type ProductContext = {
  id: number
  name: string
  imageUrl: string
  description: string
  price: number
}

type ProductTryOnClientProps = {
  product: ProductContext
  savedProfileImageUrl: string | null
  initialGeneratedDesignUrl?: string
  initialGeneratedDesignTitle?: string
  generatedImageLimit: number
  generatedImageCount: number
  remainingGenerationCount: number
}

function formatUsd(value: number): string {
  return `$${value.toFixed(6)}`
}

export function ProductTryOnClient({
  product,
  savedProfileImageUrl,
  initialGeneratedDesignUrl = "",
  initialGeneratedDesignTitle = "",
  generatedImageLimit,
  generatedImageCount,
  remainingGenerationCount,
}: ProductTryOnClientProps) {
  const [generatedDesignUrl, setGeneratedDesignUrl] = useState(initialGeneratedDesignUrl)
  const [generatedDesignTitle, setGeneratedDesignTitle] = useState(initialGeneratedDesignTitle)
  const [designCost, setDesignCost] = useState<ImageGenerationCostSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewModal, setPreviewModal] = useState<{ src: string; title: string } | null>(null)
  const [currentGeneratedImageCount, setCurrentGeneratedImageCount] = useState(generatedImageCount)
  const [currentRemainingGenerationCount, setCurrentRemainingGenerationCount] = useState(
    remainingGenerationCount
  )
  const [successMessage, setSuccessMessage] = useState("")
  const hasGeneratedResult = Boolean(generatedDesignUrl)

  const generateTryOn = async () => {
    if (!savedProfileImageUrl) {
      setErrorMessage("Add your selfie on the profile page before using try-on.")
      return
    }

    setIsGenerating(true)
    setErrorMessage("")
    setSuccessMessage("")
    setDesignCost(null)

    try {
      const selfieFile = await loadRemoteImageAsFile(savedProfileImageUrl, "profile-selfie")
      const requestBody = new FormData()
      requestBody.append("mode", "product_context")
      requestBody.append("image", selfieFile)
      requestBody.append(
        "productContext",
        JSON.stringify({
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
        })
      )

      const response = await fetch("/api/color-match/designs", {
        method: "POST",
        body: requestBody,
      })
      const payload = (await response.json()) as {
        message?: string
        imageDataUrl?: string
        imageCost?: ImageGenerationCostSummary | null
        savedTryOn?: { generatedImageUrl?: string } | null
      }

      if (!response.ok) {
        setErrorMessage(extractApiErrorMessage(payload, "Failed to generate image with current dress"))
        return
      }

      const nextImageUrl =
        payload.savedTryOn?.generatedImageUrl ??
        (typeof payload.imageDataUrl === "string" ? payload.imageDataUrl : "")

      if (!nextImageUrl) {
        setErrorMessage("Generated image is empty")
        return
      }

      setGeneratedDesignUrl(nextImageUrl)
      setGeneratedDesignTitle(`${product.name} - Current Dress`)
      setDesignCost(payload.imageCost ?? null)
      setSuccessMessage("Created. This image will also appear on your profile page.")

      if (payload.savedTryOn) {
        setCurrentGeneratedImageCount((count) => count + 1)
        setCurrentRemainingGenerationCount((count) => Math.max(count - 1, 0))
      }
    } catch {
      setErrorMessage("Network error while generating current dress image")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">Product</p>
          <p className="mt-2 text-base font-semibold">{product.name}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">Remaining generations</p>
          <p className="mt-2 text-base font-semibold">
            {currentRemainingGenerationCount} / {generatedImageLimit}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">Saved looks</p>
          <p className="mt-2 text-base font-semibold">{currentGeneratedImageCount}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Shirt className="size-4" />
              Product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="mb-4 h-[28rem] w-full rounded-lg object-cover"
              />
              <p className="text-xl font-semibold">{product.name}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{product.description}</p>
              <p className="mt-4 text-lg font-semibold">${product.price.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4" />
                Try-On
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Generate a preview using your saved profile selfie. Your created image will also be saved to your profile gallery.
                </p>
              </div>

              {!savedProfileImageUrl ? (
                <p className="text-sm text-muted-foreground">
                  Save a profile selfie first before generating a try-on.
                </p>
              ) : null}

              {!hasGeneratedResult ? (
                <Button
                  onClick={() => void generateTryOn()}
                  disabled={isGenerating || !savedProfileImageUrl || currentRemainingGenerationCount <= 0}
                >
                  {isGenerating ? "Generating..." : "Generate Try-On"}
                </Button>
              ) : null}

              {currentRemainingGenerationCount <= 0 ? (
                <p className="text-sm text-destructive">
                  You have used all {currentGeneratedImageCount} of {generatedImageLimit} available generations.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Remaining count: {currentRemainingGenerationCount} / {generatedImageLimit}
                </p>
              )}

              {successMessage ? <p className="text-sm text-foreground">{successMessage}</p> : null}
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Generated Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              {isGenerating ? (
                <div className="space-y-3">
                  <Skeleton className="h-80 w-full rounded-lg" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Creating your try-on image...
                  </div>
                </div>
              ) : generatedDesignUrl ? (
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
          </CardContent>
        </Card>
        </div>
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
    </main>
  )
}
