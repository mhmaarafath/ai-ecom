import type { Metadata } from "next"
import { HomePageClient } from "@/components/home-page-client"

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse curated dress collections and trending styles.",
}

export default function Home() {
  return <HomePageClient />
}
