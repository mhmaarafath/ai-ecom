import { NextResponse } from "next/server"
import {
  getCurrentCustomerUser,
  isValidCustomerName,
  isValidMobileNumber,
  normalizeMobileNumber,
} from "@/lib/customer-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const currentUser = await getCurrentCustomerUser()

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({ user: currentUser })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentCustomerUser()

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      name?: string
      mobileNumber?: string
    }

    const name = String(body.name ?? "").trim()
    const mobile = normalizeMobileNumber(String(body.mobileNumber ?? ""))

    if (!isValidCustomerName(name)) {
      return NextResponse.json(
        { message: "Name must be at least 2 characters long" },
        { status: 400 }
      )
    }

    if (!isValidMobileNumber(mobile)) {
      return NextResponse.json(
        { message: "Mobile number must contain 10 to 15 digits" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: duplicateUser } = await supabase
      .from("users")
      .select("id")
      .eq("mobile", mobile)
      .neq("id", currentUser.id)
      .maybeSingle()

    if (duplicateUser) {
      return NextResponse.json(
        { message: "Another account already uses this mobile number" },
        { status: 409 }
      )
    }

    const { data: user, error } = await supabase
      .from("users")
      .update({
        name,
        mobile,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUser.id)
      .select("id,name,mobile,is_admin,profile_image_url,profile_analysis,profile_analysis_saved_at,created_at")
      .single()

    if (error || !user) {
      return NextResponse.json(
        { message: "Failed to update profile", detail: error?.message },
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
        profileAnalysis: user.profile_analysis,
        profileAnalysisSavedAt: user.profile_analysis_saved_at,
        createdAt: user.created_at,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
