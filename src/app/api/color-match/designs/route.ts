import { NextResponse } from "next/server"

type GenerateDesignRequest = {
  styleDirection?: "feminine" | "masculine" | "unisex"
  dressColors: Array<{ name: string; hex: string; reason: string }>
  dressPatterns: Array<{ name: string; reason: string }>
}

type DesignResult = {
  title: string
  imageDataUrl: string
}

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string
  }>
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1"

    if (!apiKey) {
      return NextResponse.json(
        { message: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    const body = (await request.json()) as GenerateDesignRequest
    const styleDirection = body.styleDirection ?? "unisex"
    const colors = body.dressColors ?? []
    const patterns = body.dressPatterns ?? []
    const count = 1

    if (colors.length === 0 || patterns.length === 0) {
      return NextResponse.json(
        { message: "dressColors and dressPatterns are required" },
        { status: 400 }
      )
    }

    const designs: DesignResult[] = []

    for (let i = 0; i < count; i += 1) {
      const color = colors[i % colors.length]
      const pattern = patterns[i % patterns.length]
      const title = `${color.name} ${pattern.name} Dress`
      const prompt = [
        "Create a fashion mockup image of a single full-length dress design on a plain light background.",
        `Style direction: ${styleDirection}.`,
        `Primary color: ${color.name} (${color.hex}).`,
        `Pattern style: ${pattern.name}.`,
        "Show only the dress design clearly, no text, no watermark, no person wearing it.",
        "E-commerce catalog style, realistic fabric details.",
      ].join(" ")

      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt,
          size: "1024x1024",
        }),
      })

      const imagePayload = (await imageResponse.json()) as OpenAiImageResponse
      if (!imageResponse.ok) {
        return NextResponse.json(
          {
            message: "Failed to generate sample designs",
            detail: imagePayload,
          },
          { status: imageResponse.status }
        )
      }

      const b64 = imagePayload.data?.[0]?.b64_json
      if (!b64) {
        return NextResponse.json(
          { message: "Image generation returned empty result" },
          { status: 502 }
        )
      }

      designs.push({
        title,
        imageDataUrl: `data:image/png;base64,${b64}`,
      })
    }

    return NextResponse.json({ designs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
