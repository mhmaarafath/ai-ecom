"use client"

export type ImageGenerationCostSummary = {
  model: string
  quality: "low" | "medium" | "high"
  size: string
  images: number
  estimatedUsdPerImage: number
  estimatedUsdTotal: number
}

export function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function extractApiErrorMessage(payload: unknown, fallback: string): string {
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

export async function compressImageForAnalysis(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = objectUrl
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
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function loadRemoteImageAsFile(
  imageUrl: string,
  fallbackName: string
): Promise<File> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error("Failed to load image")
  }

  const blob = await response.blob()
  const contentType = blob.type || "image/jpeg"
  const extension = contentType.split("/")[1] || "jpg"
  return new File([blob], `${fallbackName}.${extension}`, { type: contentType })
}
