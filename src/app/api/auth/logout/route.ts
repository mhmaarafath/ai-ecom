import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value

    if (sessionToken) {
      const supabase = createSupabaseAdminClient()
      await supabase.from("sessions").delete().eq("session_token", sessionToken)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
