import { NextResponse } from "next/server"
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  isValidMobileNumber,
  normalizeMobileNumber,
} from "@/lib/customer-auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

type CustomerUserRow = {
  id: string
  name: string
  mobile: string
  is_admin: boolean
  created_at: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mobileNumber?: string
    }

    const mobileNumber = normalizeMobileNumber(String(body.mobileNumber ?? ""))

    if (!isValidMobileNumber(mobileNumber)) {
      return NextResponse.json(
        { message: "Mobile number must contain 10 to 15 digits" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const { data: user, error } = await supabase
      .from("users")
      .select("id,name,mobile,is_admin,created_at")
      .eq("mobile", mobileNumber)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { message: "Failed to sign in", detail: error.message },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { message: "No account found for this mobile number" },
        { status: 404 }
      )
    }

    const { sessionToken, expiresAt } = await createCustomerSession(
      (user as CustomerUserRow).id
    )

    const response = NextResponse.json({
      user: {
        id: (user as CustomerUserRow).id,
        name: (user as CustomerUserRow).name,
        mobileNumber: (user as CustomerUserRow).mobile,
        createdAt: (user as CustomerUserRow).created_at,
      },
    })

    response.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message }, { status: 500 })
  }
}
