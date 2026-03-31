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

type OpenAiImageResponse = {
  data?: Array<{
    b64_json?: string
  }>
}

function extractOutputText(payload: OpenAiResponse): string {
  const message = payload.output?.find((item) => item.type === "message")
  return (
    message?.content?.find((item) => item.type === "output_text")?.text?.trim() ?? ""
  )
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const visionModel = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini"
    const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1"

    if (!apiKey) {
      return NextResponse.json(
        { message: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const selfie = formData.get("selfie")
    const dressImageDataUrl = String(formData.get("dressImageDataUrl") ?? "")
    const dressTitle = String(formData.get("dressTitle") ?? "Dress Sample")

    if (!(selfie instanceof File) || !dressImageDataUrl) {
      return NextResponse.json(
        { message: "Selfie and dress sample image are required" },
        { status: 400 }
      )
    }

    const descriptionResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: visionModel,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Describe this dress design briefly for image editing. Mention neckline, sleeve, fit, length, and pattern in one short sentence.",
              },
              {
                type: "input_image",
                image_url: dressImageDataUrl,
              },
            ],
          },
        ],
        max_output_tokens: 90,
      }),
    })

    const descriptionPayload = (await descriptionResponse.json()) as OpenAiResponse
    if (!descriptionResponse.ok) {
      return NextResponse.json(
        { message: "Failed to analyze dress sample", detail: descriptionPayload },
        { status: descriptionResponse.status }
      )
    }

    const dressDescription =
      extractOutputText(descriptionPayload) ||
      `${dressTitle}, elegant full-length design with clean silhouette.`

    const editFormData = new FormData()
    editFormData.append("model", imageModel)
    editFormData.append(
      "prompt",
      [
        "Create a realistic virtual try-on image.",
        "Keep the person's face and identity from the original selfie.",
        `Apply this dress style: ${dressDescription}.`,
        "Keep natural body proportions and realistic fabric fit.",
        "Single person, standing pose, clean background, no text, no watermark.",
      ].join(" ")
    )
    editFormData.append("size", "1024x1024")
    editFormData.append("image", selfie, selfie.name || "selfie.jpg")

    const imageResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: editFormData,
    })

    const imagePayload = (await imageResponse.json()) as OpenAiImageResponse
    if (!imageResponse.ok) {
      return NextResponse.json(
        { message: "Failed to generate try-on image", detail: imagePayload },
        { status: imageResponse.status }
      )
    }

    const b64 = imagePayload.data?.[0]?.b64_json
    if (!b64) {
      return NextResponse.json(
        { message: "Try-on image generation returned empty result" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      dressDescription,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
