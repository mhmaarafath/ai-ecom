import { NextResponse } from "next/server"
import { logAiUsage } from "@/lib/ai-usage-log"
import { buildUsageCostSummary, type OpenAiUsage } from "@/lib/openai-pricing"

type OpenAiResponse = {
  usage?: OpenAiUsage
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

type ProfileAnalyzeResult = {
  gender: "male" | "female" | "unclear"
  face_shape: "round" | "oval" | "square" | "heart" | "long"
  skin_tone: "fair" | "light" | "medium" | "olive" | "dark"
  undertone: "warm" | "cool" | "neutral"
  recommendations: {
    colors: Array<{ name: string; hex: string }>
    avoid_colors: Array<{ name: string; hex: string }>
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

function extractOutputText(payload: OpenAiResponse): string {
  const message = payload.output?.find((item) => item.type === "message")
  const outputText = message?.content?.find((item) => item.type === "output_text")?.text
  return outputText?.trim() ?? ""
}

function parseResult(text: string): ProfileAnalyzeResult | null {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  try {
    return JSON.parse(cleaned) as ProfileAnalyzeResult
  } catch {
    return null
  }
}

function normalizeOutfitColorNames(result: ProfileAnalyzeResult): ProfileAnalyzeResult {
  const colorNameByHex = new Map(
    result.recommendations.colors.map((color) => [color.hex.toLowerCase(), color.name])
  )

  return {
    ...result,
    recommendations: {
      ...result.recommendations,
      outfits: result.recommendations.outfits.map((outfit) => {
        const withoutHexCodes = outfit.colors.replace(
          /#([A-Fa-f0-9]{6})/g,
          (hex) => colorNameByHex.get(hex.toLowerCase()) ?? ""
        )
        const normalizedColors = withoutHexCodes
          .split(/[+,/]| and /i)
          .map((part) => part.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(", ")

        return {
          ...outfit,
          colors: normalizedColors || outfit.colors,
        }
      }),
    },
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
                  "Analyze the uploaded image and extract:",
                  "1) gender (male/female/unclear), 2) face shape (round, oval, square, heart, long),",
                  "3) skin tone category (fair, light, medium, olive, dark),",
                  "4) undertone (warm, cool, neutral).",
                  "Then provide recommendations for colors, avoid colors, clothing (neck, sleeve, fit, patterns), and 3 outfits.",
                  "For colors and avoid_colors, return objects with both name and exact hex code.",
                  "For each outfit colors field, use color names only, preferably chosen from the recommended colors list.",
                  "Do not include hex codes or other color codes in outfit colors.",
                  "Return strictly valid JSON only in the exact schema.",
                ].join(" "),
              },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "profile_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                gender: {
                  type: "string",
                  enum: ["male", "female", "unclear"],
                },
                face_shape: {
                  type: "string",
                  enum: ["round", "oval", "square", "heart", "long"],
                },
                skin_tone: {
                  type: "string",
                  enum: ["fair", "light", "medium", "olive", "dark"],
                },
                undertone: {
                  type: "string",
                  enum: ["warm", "cool", "neutral"],
                },
                recommendations: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    colors: {
                      type: "array",
                      minItems: 5,
                      maxItems: 8,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          name: { type: "string" },
                          hex: { type: "string", pattern: "^#([A-Fa-f0-9]{6})$" },
                        },
                        required: ["name", "hex"],
                      },
                    },
                    avoid_colors: {
                      type: "array",
                      minItems: 3,
                      maxItems: 5,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          name: { type: "string" },
                          hex: { type: "string", pattern: "^#([A-Fa-f0-9]{6})$" },
                        },
                        required: ["name", "hex"],
                      },
                    },
                    clothing: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        neck: { type: "array", items: { type: "string" } },
                        sleeve: { type: "array", items: { type: "string" } },
                        fit: { type: "array", items: { type: "string" } },
                        patterns: { type: "array", items: { type: "string" } },
                      },
                      required: ["neck", "sleeve", "fit", "patterns"],
                    },
                    outfits: {
                      type: "array",
                      minItems: 3,
                      maxItems: 3,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          top: { type: "string" },
                          bottom: { type: "string" },
                          colors: { type: "string" },
                          reason: { type: "string" },
                        },
                        required: ["top", "bottom", "colors", "reason"],
                      },
                    },
                  },
                  required: ["colors", "avoid_colors", "clothing", "outfits"],
                },
              },
              required: ["gender", "face_shape", "skin_tone", "undertone", "recommendations"],
            },
          },
        },
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
    const parsedResult = parseResult(outputText)
    const result = parsedResult ? normalizeOutfitColorNames(parsedResult) : null
    const usage = buildUsageCostSummary(model, payload.usage)
    await logAiUsage({
      source: "/api/profile/analyze",
      description: "Analyzed profile selfie for tone, profile, and outfit recommendations",
      requestType: "text",
      model,
      usageSummary: usage,
      metadata: {
        feature: "profile_analysis",
        parsedResult: Boolean(result),
      },
    })

    if (!result) {
      return NextResponse.json({
        result: {
          gender: "unclear",
          face_shape: "oval",
          skin_tone: "medium",
          undertone: "neutral",
          recommendations: {
            colors: [
              { name: "Navy Blue", hex: "#1E3A8A" },
              { name: "Emerald Green", hex: "#10B981" },
              { name: "White", hex: "#FFFFFF" },
              { name: "Charcoal", hex: "#374151" },
              { name: "Beige", hex: "#D6BC9A" },
            ],
            avoid_colors: [
              { name: "Neon Yellow", hex: "#D9F99D" },
              { name: "Lime Green", hex: "#84CC16" },
              { name: "Hot Pink", hex: "#EC4899" },
            ],
            clothing: {
              neck: ["V-neck", "Round neck"],
              sleeve: ["Half sleeve", "Long sleeve"],
              fit: ["Regular fit", "Slim fit"],
              patterns: ["Solid", "Subtle stripes", "Small checks"],
            },
            outfits: [
              {
                top: "Navy shirt",
                bottom: "Beige chinos",
                colors: "Navy + Beige",
                reason: "Balanced contrast and versatile look.",
              },
              {
                top: "White t-shirt",
                bottom: "Charcoal trousers",
                colors: "White + Charcoal",
                reason: "Clean and flattering for most undertones.",
              },
              {
                top: "Olive polo",
                bottom: "Dark denim",
                colors: "Olive + Indigo",
                reason: "Adds depth while keeping tones natural.",
              },
            ],
          },
        } satisfies ProfileAnalyzeResult,
        usage,
      })
    }

    return NextResponse.json({
      result,
      usage,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
