import { createClient } from "@supabase/supabase-js"

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const PRODUCTS_BUCKET = process.env.SUPABASE_PRODUCTS_BUCKET ?? "products"
export const PROFILE_IMAGES_BUCKET = process.env.SUPABASE_PROFILE_IMAGES_BUCKET ?? "profile-images"
export const GENERATED_LOOKS_BUCKET = process.env.SUPABASE_GENERATED_LOOKS_BUCKET ?? "generated-looks"
