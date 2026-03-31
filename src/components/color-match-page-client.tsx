/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { ChangeEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ColorSuggestion = {
  name: string
  hex: string
  reason: string
}

type PatternSuggestion = {
  name: string
  reason: string
}

type AnalyzeResult = {
  skinToneExplanation: string
  styleDirection: "feminine" | "masculine" | "unisex"
  dressColors: ColorSuggestion[]
  dressPatterns: PatternSuggestion[]
}

type DesignSample = {
  title: string
  imageDataUrl: string
}

export function ColorMatchPageClient() {
  const [previewUrl, setPreviewUrl] = useState("")
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingDesigns, setIsGeneratingDesigns] = useState(false)
  const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [designSamples, setDesignSamples] = useState<DesignSample[]>([])
  const [tryOnImageUrl, setTryOnImageUrl] = useState("")
  const [tryOnNote, setTryOnNote] = useState("")
  const [previewModal, setPreviewModal] = useState<{
    src: string
    title: string
  } | null>(null)

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
      canvas.toBlob(resolve, "image/jpeg", 0.72)
    })

    if (!blob) return file
    return new File([blob], "analysis.jpg", { type: "image/jpeg" })
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    setErrorMessage("")
    setAnalysis(null)
    setDesignSamples([])
    setTryOnImageUrl("")
    setTryOnNote("")
    setSelfieFile(file)
    setPreviewUrl(URL.createObjectURL(file))

    try {
      const optimizedFile = await compressImageForAnalysis(file)
      const requestBody = new FormData()
      requestBody.append("image", optimizedFile)
      const response = await fetch("/api/color-match/analyze", {
        method: "POST",
        body: requestBody,
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Failed to analyze image")
        return
      }

      setAnalysis(payload.result ?? null)
    } catch {
      setErrorMessage("Network error while analyzing image")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateDressSamples = async () => {
    if (!analysis) return

    setIsGeneratingDesigns(true)
    setErrorMessage("")
    try {
      const response = await fetch("/api/color-match/designs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          styleDirection: analysis.styleDirection,
          dressColors: analysis.dressColors,
          dressPatterns: analysis.dressPatterns,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Failed to generate dress samples")
        return
      }

      setDesignSamples((payload.designs ?? []) as DesignSample[])
    } catch {
      setErrorMessage("Network error while generating dress samples")
    } finally {
      setIsGeneratingDesigns(false)
    }
  }

  const generateTryOn = async () => {
    if (!selfieFile || !designSamples[0]) return

    setIsGeneratingTryOn(true)
    setErrorMessage("")
    try {
      const requestBody = new FormData()
      requestBody.append("selfie", selfieFile)
      requestBody.append("dressImageDataUrl", designSamples[0].imageDataUrl)
      requestBody.append("dressTitle", designSamples[0].title)

      const response = await fetch("/api/color-match/try-on", {
        method: "POST",
        body: requestBody,
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Failed to generate try-on image")
        return
      }

      setTryOnImageUrl(payload.imageDataUrl ?? "")
      setTryOnNote(payload.dressDescription ?? "")
    } catch {
      setErrorMessage("Network error while generating try-on image")
    } finally {
      setIsGeneratingTryOn(false)
    }
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
        <Button asChild variant="outline">
          <Link href="/">Back to Shop</Link>
        </Button>
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
                  onClick={() =>
                    setPreviewModal({ src: previewUrl, title: "Selfie Preview" })
                  }
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
                {isAnalyzing
                  ? "Analyzing..."
                  : analysis
                    ? "Analysis Complete"
                    : "Upload image to analyze"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void generateDressSamples()}
                disabled={!analysis || isGeneratingDesigns}
              >
                {isGeneratingDesigns ? "Generating image..." : "Generate Sample Dress"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void generateTryOn()}
                disabled={!selfieFile || !designSamples[0] || isGeneratingTryOn}
              >
                {isGeneratingTryOn ? "Generating try-on..." : "Try On With Selfie"}
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                GENERATED SAMPLE
              </p>
              {designSamples[0] ? (
                <div className="rounded-lg border p-2">
                  <button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      setPreviewModal({
                        src: designSamples[0].imageDataUrl,
                        title: designSamples[0].title,
                      })
                    }
                  >
                    <img
                      src={designSamples[0].imageDataUrl}
                      alt={designSamples[0].title}
                      className="mb-2 h-72 w-full rounded-md object-cover"
                    />
                  </button>
                  <p className="text-sm font-medium">{designSamples[0].title}</p>
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Generated sample image will appear here
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                AI TRY-ON RESULT
              </p>
              {tryOnImageUrl ? (
                <div className="rounded-lg border p-2">
                  <button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      setPreviewModal({
                        src: tryOnImageUrl,
                        title: "AI Try-On Result",
                      })
                    }
                  >
                    <img
                      src={tryOnImageUrl}
                      alt="AI try-on result"
                      className="mb-2 h-72 w-full rounded-md object-cover"
                    />
                  </button>
                  {tryOnNote ? (
                    <p className="text-xs text-muted-foreground">{tryOnNote}</p>
                  ) : null}
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Try-on output will appear here
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
              <p className="text-xs font-medium text-muted-foreground">
                SKIN TONE EXPLANATION
              </p>
              {analysis?.skinToneExplanation ? (
                <p className="text-sm">{analysis.skinToneExplanation}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Upload an image to get skin tone analysis.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                STYLE DIRECTION
              </p>
              <p className="text-sm capitalize">
                {analysis?.styleDirection ?? "Will be detected after upload"}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                BEST MATCH COLORS
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(analysis?.dressColors ?? []).length > 0 ? (
                  analysis?.dressColors.map((color) => (
                    <div key={color.name} className="rounded-lg border p-2">
                      <div
                        className="mb-2 h-8 w-full rounded-md"
                        style={{ backgroundColor: color.hex }}
                      />
                      <p className="text-sm font-medium">{color.name}</p>
                      <p className="text-xs text-muted-foreground">{color.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border p-2">
                    <p className="text-xs text-muted-foreground">
                      No color suggestions yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                DRESS PATTERN SUGGESTIONS
              </p>
              <div className="space-y-2">
                {(analysis?.dressPatterns ?? []).length > 0 ? (
                  analysis?.dressPatterns.map((pattern) => (
                    <div key={pattern.name} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{pattern.name}</p>
                      <p className="text-xs text-muted-foreground">{pattern.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      No pattern suggestions yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
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
