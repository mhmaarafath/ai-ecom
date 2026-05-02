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

function extractOutputText(payload: OpenAiResponse): string {
  const message = payload.output?.find((item) => item.type === "message")
  const outputText = message?.content?.find((item) => item.type === "output_text")?.text
  return outputText?.trim() ?? ""
}

function parseSuggestion(text: string): { name: string; description: string } | null {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned) as { name?: string; description?: string }
    if (parsed.name && parsed.description) {
      return {
        name: parsed.name.trim(),
        description: parsed.description.trim(),
      }
    }
  } catch {
    return null
  }

  return null
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
                text: "From this product image, generate a concise ecommerce title and description. Return JSON only with keys: name, description. Keep name short (max 6 words). Keep description one sentence.",
              },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
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
    const usage = buildUsageCostSummary(model, payload.usage)
    const suggestion = parseSuggestion(outputText)
    await logAiUsage({
      source: "/api/products/suggest",
      description: "Generated product title and description from uploaded image",
      requestType: "text",
      model,
      usageSummary: usage,
      metadata: {
        feature: "product_management",
        parsedSuggestion: Boolean(suggestion),
      },
    })

    if (!suggestion) {
      return NextResponse.json(
        {
          message: "Could not parse AI suggestion",
          raw: outputText,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      suggestion,
      usage,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
