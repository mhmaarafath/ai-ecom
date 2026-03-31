import { NextResponse } from "next/server"
import { PRODUCTS_BUCKET, createSupabaseAdminClient } from "@/lib/supabase-admin"

type ProductRow = {
  id: number
  name: string
  image_url: string
  description: string
  price: number
  created_at: string
}

function toProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    description: row.description,
    price: Number(row.price),
    createdAt: row.created_at,
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = Number(id)
    if (Number.isNaN(productId)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const formData = await request.formData()

    const name = String(formData.get("name") ?? "").trim()
    const description = String(formData.get("description") ?? "").trim()
    const price = Number(formData.get("price"))
    const image = formData.get("image")
    const existingImageUrl = String(formData.get("existingImageUrl") ?? "").trim()

    if (!name || !description || Number.isNaN(price)) {
      return NextResponse.json(
        { message: "Name, description, and valid price are required" },
        { status: 400 }
      )
    }

    let imageUrl = existingImageUrl
    if (image instanceof File) {
      const extension = image.name.split(".").pop() || "jpg"
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`
      const filePath = `products/${fileName}`
      const imageBuffer = Buffer.from(await image.arrayBuffer())

      const { error: uploadError } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .upload(filePath, imageBuffer, {
          contentType: image.type || "application/octet-stream",
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json(
          { message: "Failed to upload image", detail: uploadError.message },
          { status: 500 }
        )
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(filePath)
      imageUrl = publicUrl
    }

    if (!imageUrl) {
      return NextResponse.json(
        { message: "Image is required. Upload one for this product." },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        description,
        price,
        image_url: imageUrl,
      })
      .eq("id", productId)
      .select("id,name,image_url,description,price,created_at")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { message: "Failed to update product", detail: error?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: toProduct(data as ProductRow) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = Number(id)
    if (Number.isNaN(productId)) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from("products").delete().eq("id", productId)

    if (error) {
      return NextResponse.json(
        { message: "Failed to delete product", detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
