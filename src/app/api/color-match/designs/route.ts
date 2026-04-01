import { NextResponse } from "next/server"

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string
    url?: string
  }>
}

type Outfit = {
  top: string
  bottom: string
  colors: string
  reason: string
}

function isOutfit(value: unknown): value is Outfit {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.top === "string" &&
    typeof candidate.bottom === "string" &&
    typeof candidate.colors === "string" &&
    typeof candidate.reason === "string"
  )
}

function parseOutfit(raw: FormDataEntryValue | null): Outfit | null {
  if (!raw) return null
  const text = String(raw).trim()
  if (!text) return null

  try {
    const parsed = JSON.parse(text) as unknown
    return isOutfit(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1"

    if (!apiKey) {
      return NextResponse.json({ message: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const formData = await request.formData()
    const imageFile = formData.get("image")
    const outfit = parseOutfit(formData.get("outfit"))

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ message: "Image file is required" }, { status: 400 })
    }
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ message: "Uploaded file must be an image" }, { status: 400 })
    }
    if (!outfit) {
      return NextResponse.json({ message: "Valid outfit JSON is required" }, { status: 400 })
    }

    const prompt = [
      "Create a highly realistic fashion photograph.",
      "Keep the exact same person from the original image.",
      "Preserve face, hairstyle, skin tone, and identity.",
      "Replace the current clothing with the requested outfit.",
      "Do not keep any original outfit colors or patterns unless they match the requested outfit.",
      `Top: ${outfit.top}.`,
      `Bottom: ${outfit.bottom}.`,
      `Color combination: ${outfit.colors}.`,
      `Style reason: ${outfit.reason}.`,
      "Modern, wearable styling with realistic fabric texture and natural folds.",
      "Keep natural body proportions and posture. If the image is upper-body only, apply outfit change to visible regions.",
      "Clean minimal background, soft natural lighting.",
      "No text or watermark.",
    ].join(" ")

    const editBody = new FormData()
    editBody.append("model", model)
    editBody.append("prompt", prompt)
    editBody.append("size", "1024x1024")
    editBody.append("input_fidelity", "high")
    editBody.append("quality", "medium")
    editBody.append("output_format", "png")
    editBody.append("image", imageFile, imageFile.name || "selfie.png")

    const imageResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: editBody,
    })

    const imagePayload = (await imageResponse.json()) as OpenAiImageResponse
    if (!imageResponse.ok) {
      return NextResponse.json(
        { message: "Failed to generate styled outfit image", detail: imagePayload },
        { status: imageResponse.status }
      )
    }

    const b64 = imagePayload.data?.[0]?.b64_json
    const url = imagePayload.data?.[0]?.url
    if (!b64 && !url) {
      return NextResponse.json({ message: "Empty image result" }, { status: 502 })
    }

    return NextResponse.json({
      imageDataUrl: b64 ? `data:image/png;base64,${b64}` : url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
