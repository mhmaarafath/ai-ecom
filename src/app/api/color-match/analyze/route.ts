import { NextResponse } from "next/server"

type OpenAiResponse = {
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

type ColorMatchResult = {
  skinToneExplanation: string
  styleDirection: "feminine" | "masculine" | "unisex"
  dressColors: Array<{
    name: string
    hex: string
    reason: string
  }>
  dressPatterns: Array<{
    name: string
    reason: string
  }>
}

function normalizeStyleDirection(value: unknown): "feminine" | "masculine" | "unisex" {
  const text = String(value ?? "").toLowerCase().trim()
  if (text === "feminine" || text === "female" || text === "woman" || text === "women") {
    return "feminine"
  }
  if (text === "masculine" || text === "male" || text === "man" || text === "men") {
    return "masculine"
  }
  return "unisex"
}

function toHexColor(input: unknown): string {
  const value = String(input ?? "").trim()
  if (!value) return "#808080"
  if (value.startsWith("#")) return value
  return `#${value}`
}

function extractOutputText(payload: OpenAiResponse): string {
  const message = payload.output?.find((item) => item.type === "message")
  const outputText = message?.content?.find((item) => item.type === "output_text")?.text
  return outputText?.trim() ?? ""
}

function extractSkinToneExplanation(text: string): string {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  const match = cleaned.match(/"skinToneExplanation"\s*:\s*"([^"]+)"/i)
  if (match?.[1]) {
    return match[1].trim()
  }
  return (
    cleaned
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("{") && !line.startsWith("[")) ||
    "Your skin tone appears balanced in this photo. Neutral-to-rich tones are likely to suit you well."
  )
}

function parseResult(text: string): ColorMatchResult | null {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  const jsonCandidate = (() => {
    const first = cleaned.indexOf("{")
    const last = cleaned.lastIndexOf("}")
    if (first !== -1 && last !== -1 && last > first) {
      return cleaned.slice(first, last + 1)
    }
    return cleaned
  })()

  try {
    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>

    const explanation =
      String(
        parsed.skinToneExplanation ??
          parsed.skin_tone_explanation ??
          parsed.explanation ??
          ""
      ).trim() || "Balanced skin tone detected from the provided image."

    const rawColors = Array.isArray(parsed.dressColors)
      ? parsed.dressColors
      : Array.isArray(parsed.colors)
        ? parsed.colors
        : []
    const rawPatterns = Array.isArray(parsed.dressPatterns)
      ? parsed.dressPatterns
      : Array.isArray(parsed.patterns)
        ? parsed.patterns
        : []

    const dressColors = rawColors
      .filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      )
      .map((item) => ({
        name: String(item.name ?? item.color ?? "Suggested Color").trim(),
        hex: toHexColor(item.hex ?? item.hexCode ?? "808080"),
        reason: String(item.reason ?? item.note ?? "Works well with your tone.").trim(),
      }))
      .slice(0, 6)

    const dressPatterns = rawPatterns
      .filter(
        (item): item is Record<string, unknown> => typeof item === "object" && item !== null
      )
      .map((item) => ({
        name: String(item.name ?? item.pattern ?? "Suggested Pattern").trim(),
        reason: String(item.reason ?? item.note ?? "Adds flattering visual balance.").trim(),
      }))
      .slice(0, 6)

    const styleDirection = normalizeStyleDirection(
      parsed.styleDirection ?? parsed.style_direction ?? parsed.style
    )

    return {
      skinToneExplanation: explanation,
      styleDirection,
      dressColors:
        dressColors.length > 0
          ? dressColors
          : [
              { name: "Deep Blue", hex: "#2D5EA8", reason: "Clean contrast with your tone." },
              { name: "Emerald Green", hex: "#1F7A5A", reason: "Enhances natural warmth." },
              { name: "Soft Beige", hex: "#D9C2A5", reason: "Creates a balanced neutral look." },
            ],
      dressPatterns:
        dressPatterns.length > 0
          ? dressPatterns
          : [
              { name: "Solid Minimal", reason: "Keeps focus on skin-tone harmony." },
              { name: "Subtle Floral", reason: "Adds softness without overpowering." },
              { name: "Vertical Stripes", reason: "Adds elegant structure and flow." },
            ],
    }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini"

    if (!apiKey) {
      return NextResponse.json(
        { message: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const image = formData.get("image")

    if (!(image instanceof File)) {
      return NextResponse.json(
        { message: "Image file is required" },
        { status: 400 }
      )
    }

    const bytes = await image.arrayBuffer()
    const base64Image = Buffer.from(bytes).toString("base64")
    const mimeType = image.type || "image/jpeg"

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  "Analyze this face photo and return JSON only with keys:",
                  "skinToneExplanation: short simple explanation in 1 sentence.",
                  "styleDirection: one of feminine, masculine, unisex based on apparent style match.",
                  "dressColors: array of exactly 3 objects with name, hex, reason.",
                  "dressPatterns: array of exactly 3 objects with name and reason.",
                  "Focus on wearable and practical fashion suggestions.",
                ].join(" "),
              },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
        max_output_tokens: 220,
      }),
    })

    const payload = (await openAiResponse.json()) as OpenAiResponse

    if (!openAiResponse.ok) {
      return NextResponse.json(
        {
          message: "OpenAI request failed",
          detail: payload,
        },
        { status: openAiResponse.status }
      )
    }

    const outputText = extractOutputText(payload)
    const result = parseResult(outputText)

    if (!result) {
      return NextResponse.json({
        result: {
          skinToneExplanation: extractSkinToneExplanation(outputText),
          styleDirection: "unisex",
          dressColors: [
            { name: "Deep Blue", hex: "#2D5EA8", reason: "Clean contrast with your tone." },
            { name: "Emerald Green", hex: "#1F7A5A", reason: "Enhances natural warmth." },
            { name: "Soft Beige", hex: "#D9C2A5", reason: "Creates a balanced neutral look." },
          ],
          dressPatterns: [
            { name: "Solid Minimal", reason: "Keeps focus on skin-tone harmony." },
            { name: "Subtle Floral", reason: "Adds softness without overpowering." },
            { name: "Vertical Stripes", reason: "Adds elegant structure and flow." },
          ],
        } satisfies ColorMatchResult,
      })
    }

    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
