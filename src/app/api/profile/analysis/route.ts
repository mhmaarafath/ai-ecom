import { NextResponse } from "next/server"
import type { AnalyzeResult, UsageCostSummary } from "@/lib/color-match-types"
import { getCurrentCustomerUser } from "@/lib/customer-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentCustomerUser()

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      analysis?: AnalyzeResult | null
      usage?: UsageCostSummary | null
    }

    if (!body.analysis) {
      return NextResponse.json({ message: "Analysis result is required" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const savedAt = new Date().toISOString()

    const { data: user, error } = await supabase
      .from("users")
      .update({
        profile_analysis: body.analysis,
        profile_analysis_saved_at: savedAt,
        updated_at: savedAt,
      })
      .eq("id", currentUser.id)
      .select("id,name,mobile,is_admin,profile_image_url,profile_analysis,profile_analysis_saved_at,created_at")
      .single()

    if (error || !user) {
      return NextResponse.json(
        { message: "Failed to save profile analysis", detail: error?.message },
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
