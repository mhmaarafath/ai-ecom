import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ColorMatchPageClient } from "@/components/color-match-page-client"
import { getCurrentCustomerUser } from "@/lib/customer-auth"
import { getGeneratedImageLimit } from "@/lib/generated-image-limit"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

type ProductRow = {
  id: number
  name: string
  image_url: string
  description: string
  price: number
}

type ProductPageProps = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Product",
  description: "View product details",
}

export default async function ProductDetailsPage({ params }: ProductPageProps) {
  const { id } = await params
  const productId = Number(id)

  if (Number.isNaN(productId)) {
    notFound()
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("products")
    .select("id,name,image_url,description,price")
    .eq("id", productId)
    .single()

  if (error || !data) {
    notFound()
  }

  const product = data as ProductRow
  const currentUser = await getCurrentCustomerUser()
  let latestTryOnUrl = ""
  let generatedImageCount = 0

  if (currentUser) {
    const { count } = await supabase
      .from("product_tryons")
      .select("*", { count: "exact", head: true })
      .eq("user_id", currentUser.id)

    generatedImageCount = count ?? 0

    const { data: latestTryOn } = await supabase
      .from("product_tryons")
      .select("generated_image_url")
      .eq("user_id", currentUser.id)
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    latestTryOnUrl = latestTryOn?.generated_image_url ?? ""
  }

  const generatedImageLimit = getGeneratedImageLimit()
  const remainingGenerationCount = Math.max(generatedImageLimit - generatedImageCount, 0)

  return (
    <ColorMatchPageClient
      productContext={{
        id: product.id,
        name: product.name,
        imageUrl: product.image_url,
        description: product.description,
        price: Number(product.price),
      }}
      useSavedProfileImageOnly
      savedProfileImageUrl={currentUser?.profileImageUrl ?? null}
      initialPreviewUrl={currentUser?.profileImageUrl ?? ""}
      initialGeneratedDesignUrl={latestTryOnUrl}
      initialGeneratedDesignTitle={latestTryOnUrl ? `${product.name} - Current Dress` : ""}
      generatedImageLimit={generatedImageLimit}
      generatedImageCount={generatedImageCount}
      remainingGenerationCount={remainingGenerationCount}
    />
  )
}
