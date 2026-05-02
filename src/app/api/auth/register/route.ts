import { NextResponse } from "next/server"
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  isValidCustomerName,
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
      name?: string
      mobileNumber?: string
    }

    const name = String(body.name ?? "").trim()
    const mobileNumber = normalizeMobileNumber(String(body.mobileNumber ?? ""))

    if (!isValidCustomerName(name)) {
      return NextResponse.json(
        { message: "Name must be at least 2 characters long" },
        { status: 400 }
      )
    }

    if (!isValidMobileNumber(mobileNumber)) {
      return NextResponse.json(
        { message: "Mobile number must contain 10 to 15 digits" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("mobile", mobileNumber)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this mobile number already exists" },
        { status: 409 }
      )
    }

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name,
        mobile: mobileNumber,
        is_admin: false,
      })
      .select("id,name,mobile,is_admin,created_at")
      .single()

    if (error || !user) {
      return NextResponse.json(
        { message: "Failed to create account", detail: error?.message },
        { status: 500 }
      )
    }

    const { sessionToken, expiresAt } = await createCustomerSession(
      (user as CustomerUserRow).id
    )

    const response = NextResponse.json(
      {
        user: {
          id: (user as CustomerUserRow).id,
          name: (user as CustomerUserRow).name,
          mobileNumber: (user as CustomerUserRow).mobile,
          createdAt: (user as CustomerUserRow).created_at,
        },
      },
      { status: 201 }
    )

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
