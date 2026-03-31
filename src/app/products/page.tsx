import type { Metadata } from "next"
import { ProductsManagementPage } from "@/components/products-management-page"

export const metadata: Metadata = {
  title: "Products",
  description: "Manage your product catalog with AI-assisted descriptions.",
}

export default function ProductsPage() {
  return <ProductsManagementPage />
}
