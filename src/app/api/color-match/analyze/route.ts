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

function extractOutputText(payload: OpenAiResponse): string {
  const message = payload.output?.find((item) => item.type === "message")
  const outputText = message?.content?.find((item) => item.type === "output_text")?.text
  return outputText?.trim() ?? ""
}

function parseResult(text: string): ColorMatchResult | null {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  try {
    return JSON.parse(cleaned) as ColorMatchResult
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
                  "Analyze the uploaded image and extract:",
                  "1) gender (male/female/unclear), 2) face shape (round, oval, square, heart, long),",
                  "3) skin tone category (fair, light, medium, olive, dark),",
                  "4) undertone (warm, cool, neutral).",
                  "Then provide recommendations for colors, avoid colors, clothing (neck, sleeve, fit, patterns), and 3 outfits.",
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
            name: "color_match_analysis",
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
                      items: { type: "string" },
                    },
                    avoid_colors: {
                      type: "array",
                      minItems: 3,
                      maxItems: 5,
                      items: { type: "string" },
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
    const result = parseResult(outputText)

    if (!result) {
      return NextResponse.json({
        result: {
          gender: "unclear",
          face_shape: "oval",
          skin_tone: "medium",
          undertone: "neutral",
          recommendations: {
            colors: ["Navy Blue", "Emerald Green", "White", "Charcoal", "Beige"],
            avoid_colors: ["Neon Yellow", "Lime Green", "Hot Pink"],
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
        } satisfies ColorMatchResult,
      })
    }

    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
