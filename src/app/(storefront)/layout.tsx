import { StorefrontShell } from "@/components/storefront-shell"
import { getCurrentCustomerUser } from "@/lib/customer-auth"

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const currentUser = await getCurrentCustomerUser()

  return <StorefrontShell currentUser={currentUser}>{children}</StorefrontShell>
}
