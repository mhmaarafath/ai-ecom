import { cookies } from "next/headers"
import type { AnalyzeResult } from "@/lib/color-match-types"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export const CUSTOMER_SESSION_COOKIE = "ai_ecom_user_session"
const SESSION_DURATION_DAYS = 30

export type CustomerUser = {
  id: string
  name: string
  mobileNumber: string
  isAdmin: boolean
  profileImageUrl: string | null
  profileAnalysis: AnalyzeResult | null
  profileAnalysisSavedAt: string | null
  createdAt: string
}

type CustomerUserRow = {
  id: string
  name: string
  mobile: string
  is_admin: boolean
  profile_image_url: string | null
  profile_analysis: AnalyzeResult | null
  profile_analysis_saved_at: string | null
  created_at: string
}

type CustomerSessionRow = {
  user_id: string
  expires_at: string
}

function toCustomerUser(row: CustomerUserRow): CustomerUser {
  return {
    id: row.id,
    name: row.name,
    mobileNumber: row.mobile,
    isAdmin: row.is_admin,
    profileImageUrl: row.profile_image_url,
    profileAnalysis: row.profile_analysis,
    profileAnalysisSavedAt: row.profile_analysis_saved_at,
    createdAt: row.created_at,
  }
}

export function normalizeMobileNumber(value: string): string {
  return value.replace(/\D+/g, "")
}

export function isValidMobileNumber(value: string): boolean {
  return /^\d{10,15}$/.test(value)
}

export function isValidCustomerName(value: string): boolean {
  return value.trim().length >= 2
}

export function buildSessionExpiryDate(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
  return expiresAt
}

export async function createCustomerSession(userId: string) {
  const supabase = createSupabaseAdminClient()
  const sessionToken = crypto.randomUUID()
  const expiresAt = buildSessionExpiryDate()

  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    session_token: sessionToken,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }

  return {
    sessionToken,
    expiresAt,
  }
}

export async function getCurrentCustomerUser(): Promise<CustomerUser | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value

  if (!sessionToken) return null

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id,expires_at")
    .eq("session_token", sessionToken)
    .gt("expires_at", now)
    .maybeSingle()

  if (sessionError || !session) return null

  await supabase
    .from("sessions")
    .update({ last_seen_at: now })
    .eq("session_token", sessionToken)

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,name,mobile,is_admin,profile_image_url,profile_analysis,profile_analysis_saved_at,created_at")
    .eq("id", (session as CustomerSessionRow).user_id)
    .maybeSingle()

  if (userError || !user) return null

  return toCustomerUser(user as CustomerUserRow)
}
