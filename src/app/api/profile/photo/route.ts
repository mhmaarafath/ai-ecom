import { NextResponse } from "next/server"
import { getCurrentCustomerUser } from "@/lib/customer-auth"
import { PROFILE_IMAGES_BUCKET, createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentCustomerUser()

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get("image")

    if (!(image instanceof File)) {
      return NextResponse.json({ message: "Profile image is required" }, { status: 400 })
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ message: "Uploaded file must be an image" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const extension = image.name.split(".").pop() || "jpg"
    const filePath = `users/${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    const imageBuffer = Buffer.from(await image.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_IMAGES_BUCKET)
      .upload(filePath, imageBuffer, {
        contentType: image.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { message: "Failed to upload profile image", detail: uploadError.message },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(filePath)

    const { data: user, error } = await supabase
      .from("users")
      .update({
        profile_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUser.id)
      .select("id,name,mobile,is_admin,profile_image_url,profile_analysis,profile_analysis_saved_at,created_at")
      .single()

    if (error || !user) {
      return NextResponse.json(
        { message: "Failed to save profile image", detail: error?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobile,
        isAdmin: user.is_admin,
        profileImageUrl: user.profile_image_url,
        profileAnalysis: user.profile_analysis ?? null,
        profileAnalysisSavedAt: user.profile_analysis_saved_at ?? null,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
