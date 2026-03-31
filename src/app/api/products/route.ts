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

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()

    const { data, error } = await supabase
      .from("products")
      .select("id,name,image_url,description,price,created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { message: "Failed to load products", detail: error.message },
        { status: 500 }
      )
    }

    const products = ((data ?? []) as ProductRow[]).map(toProduct)
    return NextResponse.json({ products })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseAdminClient()
    const formData = await request.formData()

    const name = String(formData.get("name") ?? "").trim()
    const description = String(formData.get("description") ?? "").trim()
    const price = Number(formData.get("price"))
    const image = formData.get("image")

    if (!name || !description || Number.isNaN(price)) {
      return NextResponse.json(
        { message: "Name, description, and valid price are required" },
        { status: 400 }
      )
    }

    if (!(image instanceof File)) {
      return NextResponse.json(
        { message: "Product image is required" },
        { status: 400 }
      )
    }

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

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        description,
        price,
        image_url: publicUrl,
      })
      .select("id,name,image_url,description,price,created_at")
      .single()

    if (error || !data) {
      return NextResponse.json(
        { message: "Failed to save product", detail: error?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ product: toProduct(data as ProductRow) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
