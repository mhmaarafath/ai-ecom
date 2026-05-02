import { redirect } from "next/navigation"

export default function DashboardProductsRedirectPage() {
  redirect("/admin/products")
}
