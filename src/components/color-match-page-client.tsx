/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { ChangeEvent, useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AnalyzeResult = {
  gender: "male" | "female" | "unclear"
  face_shape: "round" | "oval" | "square" | "heart" | "long"
  skin_tone: "fair" | "light" | "medium" | "olive" | "dark"
  undertone: "warm" | "cool" | "neutral"
  recommendations: {
    colors: string[]
    avoid_colors: string[]
    clothing: {
      neck: string[]
      sleeve: string[]
      fit: string[]
      patterns: string[]
    }
    outfits: Array<{
      top: string
      bottom: string
      colors: string
      reason: string
    }>
  }
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function toSentenceCase(value: string): string {
  const text = value.trim()
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const COLOR_OVERRIDES: Record<string, string> = {
  "light blue": "#60a5fa",
  "pastel blue": "#93c5fd",
  "pastel colors": "#f9a8d4",
  "warm white": "#fff4e6",
  ivory: "#fffff0",
  cream: "#fffdd0",
  camel: "#c19a6b",
  tan: "#d2b48c",
  mustard: "#d4a017",
  rust: "#b7410e",
  terracotta: "#e2725b",
  "ashy gray": "#b2b6bd",
  "cool beige": "#d8c8b0",
  "icy pastels": "#cdeef7",
  "neon green": "#39ff14",
  "bright magenta": "#ff00aa",
  "hot pink": "#ec4899",
  "charcoal": "#374151",
  "charcoal gray": "#374151",
  "neon colors": "#a3e635",
  "dark brown": "#5b3a29",
  beige: "#d6bc9a",
}

function colorTextToHex(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ")
  if (normalized.startsWith("#")) return normalized
  if (COLOR_OVERRIDES[normalized]) return COLOR_OVERRIDES[normalized]

  if (normalized.includes("white")) return "#f8fafc"
  if (normalized.includes("ivory")) return "#fffff0"
  if (normalized.includes("cream")) return "#fffdd0"
  if (normalized.includes("beige")) return "#e8d7b7"
  if (normalized.includes("gray") || normalized.includes("grey")) return "#9ca3af"
  if (normalized.includes("pastel")) return "#d8b4fe"
  if (normalized.includes("neon")) return "#39ff14"
  if (normalized.includes("magenta")) return "#ff00aa"
  if (normalized.includes("mustard")) return "#d4a017"
  if (normalized.includes("camel")) return "#c19a6b"
  if (normalized.includes("tan")) return "#d2b48c"
  if (normalized.includes("rust")) return "#b7410e"
  if (normalized.includes("terracotta")) return "#e2725b"

  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 55%)`
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

export function ColorMatchPageClient() {
  const [previewUrl, setPreviewUrl] = useState("")
  const [optimizedImage, setOptimizedImage] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingDesign, setIsGeneratingDesign] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0)
  const [generatedDesignUrl, setGeneratedDesignUrl] = useState("")
  const [generatedDesignTitle, setGeneratedDesignTitle] = useState("")
  const [generatedByOutfit, setGeneratedByOutfit] = useState<
    Record<number, { imageUrl: string; title: string }>
  >({})
  const [previewModal, setPreviewModal] = useState<{ src: string; title: string } | null>(null)

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
      return
    }

    setIsGeneratingDesign(true)
    setErrorMessage("")
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
        },
      }))
      setGeneratedDesignUrl(imageDataUrl)
      setGeneratedDesignTitle(generatedTitle)
    } catch {
      setErrorMessage("Network error while generating styled outfit")
    } finally {
      setIsGeneratingDesign(false)
    }
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    setErrorMessage("")
    setAnalysis(null)
    setSelectedOutfitIndex(0)
    setGeneratedDesignUrl("")
    setGeneratedDesignTitle("")
    setGeneratedByOutfit({})
    setOptimizedImage(null)
    setPreviewUrl(URL.createObjectURL(file))

    try {
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
      setAnalysis(nextAnalysis)
      setSelectedOutfitIndex(0)
      if (nextAnalysis?.recommendations.outfits?.length) {
        await generateDesignFor(nextAnalysis, optimizedFile, 0)
      }
    } catch {
      setErrorMessage("Network error while analyzing image")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateDesign = async () => {
    if (!analysis || !optimizedImage) return
    await generateDesignFor(analysis, optimizedImage, selectedOutfitIndex)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Face Tone Color Match
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload your selfie and preview recommended color combinations.
          </p>
        </div>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to Shop
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Selfie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selfie-upload">Choose Image</Label>
              <Input
                id="selfie-upload"
                type="file"
                accept="image/*"
                onChange={onUpload}
              />
            </div>

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

            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : analysis ? "Analysis Complete" : "Upload image to analyze"}
              </Button>
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
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Generated outfit image will appear here
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>AI Match Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg border p-3">
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

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">RECOMMENDED COLORS</p>
              {analysis?.recommendations.colors?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendations.colors.map((color) => (
                    <span key={color} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                      <span
                        className="h-3 w-3 rounded-full border"
                        style={{ backgroundColor: colorTextToHex(color) }}
                      />
                      {toTitleCase(color)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No colors yet.</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">AVOID COLORS</p>
              {analysis?.recommendations.avoid_colors?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendations.avoid_colors.map((color) => (
                    <span key={color} className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive">
                      <span
                        className="h-3 w-3 rounded-full border border-destructive/40"
                        style={{ backgroundColor: colorTextToHex(color) }}
                      />
                      {toTitleCase(color)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No avoid list yet.</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
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

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">OUTFIT SUGGESTIONS</p>
              {analysis?.recommendations.outfits?.length ? (
                <div className="space-y-2">
                  {analysis.recommendations.outfits.map((item, index) => (
                    <button
                      key={`${item.top}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedOutfitIndex(index)
                        const cached = generatedByOutfit[index]
                        if (cached) {
                          setGeneratedDesignUrl(cached.imageUrl)
                          setGeneratedDesignTitle(cached.title)
                        } else if (analysis && optimizedImage) {
                          void generateDesignFor(analysis, optimizedImage, index)
                        }
                      }}
                      className={`w-full rounded-md border p-2 text-left ${
                        selectedOutfitIndex === index ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <p className="text-xs font-medium">{toTitleCase(item.top)} + {toTitleCase(item.bottom)}</p>
                      <p className="text-xs text-muted-foreground">{toTitleCase(item.colors)}</p>
                      <p className="text-xs text-muted-foreground">{toSentenceCase(item.reason)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No outfits yet.</p>
              )}
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
    </main>
  )
}
