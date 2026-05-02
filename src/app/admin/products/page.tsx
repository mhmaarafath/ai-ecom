import type { Metadata } from "next"
import { ProductsManagementPage } from "@/components/products-management-page"

export const metadata: Metadata = {
  title: "Admin Products",
  description: "Manage your product catalog with AI-assisted descriptions.",
}

export default function AdminProductsPage() {
  return <ProductsManagementPage />
}
