import type { Metadata } from "next"
import { ColorMatchPageClient } from "@/components/color-match-page-client"

export const metadata: Metadata = {
  title: "Color Match",
  description: "Upload your selfie to get AI-based color and pattern recommendations.",
}

export default function ColorMatchPage() {
  return <ColorMatchPageClient />
}
