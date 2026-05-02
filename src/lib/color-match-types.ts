export type AnalyzeResult = {
  gender: "male" | "female" | "unclear"
  face_shape: "round" | "oval" | "square" | "heart" | "long"
  skin_tone: "fair" | "light" | "medium" | "olive" | "dark"
  undertone: "warm" | "cool" | "neutral"
  recommendations: {
    colors: Array<{ name: string; hex: string }>
    avoid_colors: Array<{ name: string; hex: string }>
    clothing: {
      neck: string[]
      sleeve: string[]
      fit: string[]
      patterns: string[]
    }
    outfits: Array<{
      top: string
      bottom: string
      colors: string
      reason: string
    }>
  }
}

export type UsageCostSummary = {
  tokens: {
    input: number
    output: number
    total: number
  }
  estimatedUsd: {
    input: number
    output: number
    total: number
  }
}
