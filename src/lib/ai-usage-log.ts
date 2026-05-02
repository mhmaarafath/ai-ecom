import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import type { ImageGenerationCostSummary, UsageCostSummary } from "@/lib/openai-pricing"

type AiUsageLogInput = {
  source: string
  description: string
  requestType: "text" | "image"
  model: string
  usageSummary?: UsageCostSummary | null
  imageCostSummary?: ImageGenerationCostSummary | null
  metadata?: Record<string, unknown>
}

export async function logAiUsage(input: AiUsageLogInput): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient()
    const usage = input.usageSummary
    const imageCost = input.imageCostSummary

    const payload = {
      source: input.source,
      description: input.description,
      request_type: input.requestType,
      model: input.model,
      input_tokens: usage?.tokens.input ?? null,
      output_tokens: usage?.tokens.output ?? null,
      total_tokens: usage?.tokens.total ?? null,
      estimated_cost_usd: usage?.estimatedUsd.total ?? imageCost?.estimatedUsdTotal ?? 0,
      currency: "USD",
      metadata: input.metadata ?? {},
    }

    await supabase.from("ai_usage_logs").insert(payload)
  } catch {
    // Logging must not break primary API flows.
  }
}
