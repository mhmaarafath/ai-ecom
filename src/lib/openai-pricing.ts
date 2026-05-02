type OpenAiUsage = {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

type UsageCostSummary = {
  tokens: {
    input: number
    output: number
    total: number
  }
  ratesPer1M: {
    input: number
    output: number
  }
  estimatedUsd: {
    input: number
    output: number
    total: number
  }
}

const MODEL_RATES_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 2.5, output: 15 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
}

type ImageGenerationCostSummary = {
  model: string
  quality: "low" | "medium" | "high"
  size: string
  images: number
  estimatedUsdPerImage: number
  estimatedUsdTotal: number
}

const IMAGE_GENERATION_PER_IMAGE_USD: Record<
  string,
  Partial<Record<"low" | "medium" | "high", Record<string, number>>>
> = {
  "gpt-image-1.5": {
    low: {
      "1024x1024": 0.009,
      "1024x1536": 0.013,
      "1536x1024": 0.013,
    },
    medium: {
      "1024x1024": 0.034,
      "1024x1536": 0.05,
      "1536x1024": 0.05,
    },
    high: {
      "1024x1024": 0.133,
      "1024x1536": 0.2,
      "1536x1024": 0.2,
    },
  },
  "gpt-image-1": {
    low: { "1024x1024": 0.01 },
    medium: { "1024x1024": 0.04 },
    high: { "1024x1024": 0.17 },
  },
}

function parseRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

function toCurrencyValue(value: number): number {
  return Number(value.toFixed(6))
}

export function buildUsageCostSummary(
  model: string,
  usage: OpenAiUsage | null | undefined
): UsageCostSummary | null {
  if (!usage) return null

  const defaultRates = MODEL_RATES_PER_1M[model.toLowerCase()] ?? { input: 0, output: 0 }
  const inputRatePer1M = parseRate(process.env.OPENAI_INPUT_COST_PER_1M, defaultRates.input)
  const outputRatePer1M = parseRate(process.env.OPENAI_OUTPUT_COST_PER_1M, defaultRates.output)

  const inputTokens = Number.isFinite(usage.input_tokens) ? Math.max(0, usage.input_tokens ?? 0) : 0
  const outputTokens = Number.isFinite(usage.output_tokens)
    ? Math.max(0, usage.output_tokens ?? 0)
    : 0
  const totalTokens = Number.isFinite(usage.total_tokens)
    ? Math.max(0, usage.total_tokens ?? 0)
    : inputTokens + outputTokens

  const inputCost = (inputTokens / 1_000_000) * inputRatePer1M
  const outputCost = (outputTokens / 1_000_000) * outputRatePer1M
  const totalCost = inputCost + outputCost

  return {
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    ratesPer1M: {
      input: inputRatePer1M,
      output: outputRatePer1M,
    },
    estimatedUsd: {
      input: toCurrencyValue(inputCost),
      output: toCurrencyValue(outputCost),
      total: toCurrencyValue(totalCost),
    },
  }
}

export function buildImageGenerationCostSummary(input: {
  model: string
  quality: "low" | "medium" | "high"
  size: string
  images?: number
}): ImageGenerationCostSummary {
  const images = Number.isFinite(input.images) ? Math.max(1, input.images ?? 1) : 1
  const normalizedModel = input.model.toLowerCase()
  const override = parseRate(process.env.OPENAI_IMAGE_COST_PER_IMAGE, -1)
  const modelPrice = IMAGE_GENERATION_PER_IMAGE_USD[normalizedModel]
  const mappedPrice = modelPrice?.[input.quality]?.[input.size] ?? 0
  const estimatedUsdPerImage = override >= 0 ? override : mappedPrice
  const estimatedUsdTotal = estimatedUsdPerImage * images

  return {
    model: input.model,
    quality: input.quality,
    size: input.size,
    images,
    estimatedUsdPerImage: toCurrencyValue(estimatedUsdPerImage),
    estimatedUsdTotal: toCurrencyValue(estimatedUsdTotal),
  }
}

export type { OpenAiUsage, UsageCostSummary, ImageGenerationCostSummary }
