import { NextResponse } from "next/server"
import { getCurrentCustomerUser } from "@/lib/customer-auth"
import { logAiUsage } from "@/lib/ai-usage-log"
import { getGeneratedImageLimit } from "@/lib/generated-image-limit"
import { buildImageGenerationCostSummary } from "@/lib/openai-pricing"
import { GENERATED_LOOKS_BUCKET, createSupabaseAdminClient } from "@/lib/supabase-admin"

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

type ProductContextInput = {
  id: number
  name: string
  description: string
  imageUrl: string
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

function isProductContextInput(value: unknown): value is ProductContextInput {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.imageUrl === "string"
  )
}

async function toGeneratedImageFile(
  b64: string | undefined,
  url: string | undefined
): Promise<File | null> {
  if (b64) {
    const buffer = Buffer.from(b64, "base64")
    return new File([buffer], "generated-look.png", { type: "image/png" })
  }

  if (url) {
    const response = await fetch(url)
    if (!response.ok) return null
    const contentType = response.headers.get("content-type") || "image/png"
    const buffer = await response.arrayBuffer()
    return new File([buffer], "generated-look.png", { type: contentType })
  }

  return null
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

function parseProductContext(raw: FormDataEntryValue | null): ProductContextInput | null {
  if (!raw) return null
  const text = String(raw).trim()
  if (!text) return null

  try {
    const parsed = JSON.parse(text) as unknown
    return isProductContextInput(parsed) ? parsed : null
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
    const mode = String(formData.get("mode") ?? "suggested_outfit")
    const outfit = parseOutfit(formData.get("outfit"))
    const productContext = parseProductContext(formData.get("productContext"))

    if (!(imageFile instanceof File)) {
      return NextResponse.json({ message: "Image file is required" }, { status: 400 })
    }
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ message: "Uploaded file must be an image" }, { status: 400 })
    }
    if (mode === "product_context" && !productContext) {
      return NextResponse.json({ message: "Valid product context JSON is required" }, { status: 400 })
    }
    if (mode !== "product_context" && !outfit) {
      return NextResponse.json({ message: "Valid outfit JSON is required" }, { status: 400 })
    }

    let currentUser: Awaited<ReturnType<typeof getCurrentCustomerUser>> = null
    if (mode === "product_context") {
      currentUser = await getCurrentCustomerUser()
      if (!currentUser) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }

      const supabase = createSupabaseAdminClient()
      const { count } = await supabase
        .from("product_tryons")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id)

      const generatedImageLimit = getGeneratedImageLimit()
      const generatedImageCount = count ?? 0

      if (generatedImageCount >= generatedImageLimit) {
        return NextResponse.json(
          {
            message: `Image generation limit reached. Remaining count: 0 of ${generatedImageLimit}.`,
            generatedImageLimit,
            generatedImageCount,
            remainingGenerationCount: 0,
          },
          { status: 403 }
        )
      }
    }

    const prompt =
      mode === "product_context" && productContext
        ? [
            "Create a highly realistic fashion photograph.",
            "Keep the exact same person from the original image.",
            "Preserve face, hairstyle, skin tone, and identity.",
            "Replace current clothing with the same dress/outfit shown in the product reference image.",
            `Product name: ${productContext.name}.`,
            `Product description: ${productContext.description}.`,
            "Match neckline, sleeves, fit, pattern, and overall color palette from the product reference.",
            "Do not invent unrelated clothing styles.",
            "Modern, wearable styling with realistic fabric texture and natural folds.",
            "Keep natural body proportions and posture. If the image is upper-body only, apply outfit change to visible regions.",
            "Clean minimal background, soft natural lighting.",
            "No text or watermark.",
          ].join(" ")
        : [
            "Create a highly realistic fashion photograph.",
            "Keep the exact same person from the original image.",
            "Preserve face, hairstyle, skin tone, and identity.",
            "Replace the current clothing with the requested outfit.",
            "Do not keep any original outfit colors or patterns unless they match the requested outfit.",
            `Top: ${outfit?.top ?? ""}.`,
            `Bottom: ${outfit?.bottom ?? ""}.`,
            `Color combination: ${outfit?.colors ?? ""}.`,
            `Style reason: ${outfit?.reason ?? ""}.`,
            "Modern, wearable styling with realistic fabric texture and natural folds.",
            "Keep natural body proportions and posture. If the image is upper-body only, apply outfit change to visible regions.",
            "Clean minimal background, soft natural lighting.",
            "No text or watermark.",
          ].join(" ")

    const quality: "low" | "medium" | "high" = "medium"
    const size = "1024x1024"
    const editBody = new FormData()
    editBody.append("model", model)
    editBody.append("prompt", prompt)
    editBody.append("size", size)
    editBody.append("input_fidelity", "high")
    editBody.append("quality", quality)
    editBody.append("output_format", "png")
    const selfieName = imageFile.name || "selfie.png"
    if (mode === "product_context") {
      editBody.append("image[]", imageFile, selfieName)
    } else {
      editBody.append("image", imageFile, selfieName)
    }
    if (mode === "product_context" && productContext?.imageUrl) {
      try {
        const referenceResponse = await fetch(productContext.imageUrl)
        if (referenceResponse.ok) {
          const contentType = referenceResponse.headers.get("content-type") || "image/jpeg"
          const referenceBuffer = await referenceResponse.arrayBuffer()
          const referenceFile = new File([referenceBuffer], "product-reference.jpg", {
            type: contentType,
          })
          editBody.append("image[]", referenceFile, referenceFile.name)
        }
      } catch {
        // Continue without reference image if remote fetch fails.
      }
    }

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

    const imageCost = buildImageGenerationCostSummary({
      model,
      quality,
      size,
      images: 1,
    })

    let savedTryOn: {
      id: string
      userId: string
      productId: number
      generatedImageUrl: string
      createdAt: string
    } | null = null

    if (mode === "product_context" && productContext) {
      if (currentUser) {
        const generatedFile = await toGeneratedImageFile(b64, url)
        if (generatedFile) {
          const supabase = createSupabaseAdminClient()
          const extension = generatedFile.name.split(".").pop() || "png"
          const filePath =
            `tryons/${currentUser.id}/${productContext.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
          const imageBuffer = Buffer.from(await generatedFile.arrayBuffer())

          const { error: uploadError } = await supabase.storage
            .from(GENERATED_LOOKS_BUCKET)
            .upload(filePath, imageBuffer, {
              contentType: generatedFile.type || "application/octet-stream",
              upsert: false,
            })

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from(GENERATED_LOOKS_BUCKET).getPublicUrl(filePath)

            const { data: tryOnRow } = await supabase
              .from("product_tryons")
              .insert({
                user_id: currentUser.id,
                product_id: productContext.id,
                generated_image_url: publicUrl,
              })
              .select("id,user_id,product_id,generated_image_url,created_at")
              .single()

            if (tryOnRow) {
              savedTryOn = {
                id: tryOnRow.id,
                userId: tryOnRow.user_id,
                productId: Number(tryOnRow.product_id),
                generatedImageUrl: tryOnRow.generated_image_url,
                createdAt: tryOnRow.created_at,
              }
            }
          }
        }
      }
    }

    await logAiUsage({
      source: "/api/color-match/designs",
      description:
        mode === "product_context"
          ? "Generated try-on image using selected product as dress reference"
          : "Generated styled outfit image from selected outfit recommendation",
      requestType: "image",
      model,
      imageCostSummary: imageCost,
      metadata: {
        feature: "color_match",
        mode,
        quality,
        size,
      },
    })

    return NextResponse.json({
      imageDataUrl: savedTryOn?.generatedImageUrl ?? (b64 ? `data:image/png;base64,${b64}` : url),
      imageCost,
      savedTryOn,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
