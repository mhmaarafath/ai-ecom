import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ProfilePageClient } from "@/components/profile-page-client"
import { getCurrentCustomerUser } from "@/lib/customer-auth"
import { getGeneratedImageLimit } from "@/lib/generated-image-limit"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your account profile.",
}

export default async function ProfilePage() {
  const currentUser = await getCurrentCustomerUser()

  if (!currentUser) {
    redirect("/login")
  }

  const supabase = createSupabaseAdminClient()
  const { data: generatedImages } = await supabase
    .from("product_tryons")
    .select("id,product_id,generated_image_url,created_at,products(name,image_url)")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  const generatedLooks = ((generatedImages ?? []) as Array<{
    id: string
    product_id: number
    generated_image_url: string
    created_at: string
    products: { name: string; image_url: string } | { name: string; image_url: string }[] | null
  }>).map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    return {
      id: item.id,
      productId: item.product_id,
      generatedImageUrl: item.generated_image_url,
      createdAt: item.created_at,
      productName: product?.name ?? `Product #${item.product_id}`,
      productImageUrl: product?.image_url ?? "",
    }
  })

  const generatedImageLimit = getGeneratedImageLimit()
  const generatedImageCount = generatedLooks.length
  const remainingGenerationCount = Math.max(generatedImageLimit - generatedImageCount, 0)

  return (
    <ProfilePageClient
      user={currentUser}
      generatedLooks={generatedLooks}
      generatedImageLimit={generatedImageLimit}
      generatedImageCount={generatedImageCount}
      remainingGenerationCount={remainingGenerationCount}
    />
  )
}
