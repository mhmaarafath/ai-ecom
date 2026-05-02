import type { Metadata } from "next"
import { HomePageClient } from "@/components/home-page-client"
import { getCurrentCustomerUser } from "@/lib/customer-auth"

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse curated dress collections and trending styles.",
}

export default async function Home() {
  const currentUser = await getCurrentCustomerUser()

  return <HomePageClient currentUser={currentUser} />
}
