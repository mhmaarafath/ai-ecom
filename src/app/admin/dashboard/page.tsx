import type { Metadata } from "next"
import Link from "next/link"
import { Boxes, ImageIcon, Sparkles, Users } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard summary for products and activity.",
}

function formatShortDay(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

export default async function AdminDashboardPage() {
  let productsCount = 0
  let customersCount = 0
  let generatedImagesCount = 0
  let aiRequestsCount = 0
  let aiEstimatedCost = 0
  let activityByDay: Array<{
    label: string
    customers: number
    tryOns: number
  }> = []
  let recentCustomers: Array<{
    id: string
    name: string
    mobile: string
    created_at: string
  }> = []

  try {
    const supabase = createSupabaseAdminClient()
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0, 0, 0, 0)

    const [
      productsResult,
      customersResult,
      tryOnsResult,
      aiLogsResult,
      recentCustomersResult,
      customersActivityResult,
      tryOnsActivityResult,
    ] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("is_admin", false),
      supabase.from("product_tryons").select("*", { count: "exact", head: true }),
      supabase.from("ai_usage_logs").select("estimated_cost_usd", { count: "exact" }),
      supabase
        .from("users")
        .select("id,name,mobile,created_at")
        .eq("is_admin", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("users")
        .select("created_at")
        .eq("is_admin", false)
        .gte("created_at", startDate.toISOString()),
      supabase
        .from("product_tryons")
        .select("created_at")
        .gte("created_at", startDate.toISOString()),
    ])

    productsCount = productsResult.count ?? 0
    customersCount = customersResult.count ?? 0
    generatedImagesCount = tryOnsResult.count ?? 0
    aiRequestsCount = aiLogsResult.count ?? 0
    aiEstimatedCost =
      aiLogsResult.data?.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0) ?? 0
    recentCustomers =
      (recentCustomersResult.data as Array<{
        id: string
        name: string
        mobile: string
        created_at: string
      }> | null) ?? []

    const customerCounts = new Map<string, number>()
    const tryOnCounts = new Map<string, number>()

    for (const row of customersActivityResult.data ?? []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10)
      customerCounts.set(key, (customerCounts.get(key) ?? 0) + 1)
    }

    for (const row of tryOnsActivityResult.data ?? []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10)
      tryOnCounts.set(key, (tryOnCounts.get(key) ?? 0) + 1)
    }

    activityByDay = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + index)
      const key = day.toISOString().slice(0, 10)

      return {
        label: formatShortDay(day),
        customers: customerCounts.get(key) ?? 0,
        tryOns: tryOnCounts.get(key) ?? 0,
      }
    })
  } catch {
    productsCount = 0
    customersCount = 0
    generatedImagesCount = 0
    aiRequestsCount = 0
    aiEstimatedCost = 0
    activityByDay = []
    recentCustomers = []
  }

  const maxActivityValue = Math.max(
    1,
    ...activityByDay.flatMap((item) => [item.customers, item.tryOns])
  )

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <div className="flex w-full items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            </div>
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-all hover:bg-muted"
            >
              Visit Website
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-3 p-4 pt-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="size-4" />
                  Total Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold">{productsCount}</p>
                <p className="text-xs text-muted-foreground">Products currently listed in the catalog</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" />
                  Customers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold">{customersCount}</p>
                <p className="text-xs text-muted-foreground">Registered customer accounts</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="size-4" />
                  Generated Looks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold">{generatedImagesCount}</p>
                <p className="text-xs text-muted-foreground">Saved try-on images across all users</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4" />
                  AI Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold">{aiRequestsCount}</p>
                <p className="text-xs text-muted-foreground">
                  Estimated cost ${aiEstimatedCost.toFixed(4)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle>Dashboard Notes</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Catalog Health</p>
                  <p className="mt-1.5 text-sm font-semibold">
                    {productsCount > 0 ? "Active" : "Empty"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep product images and descriptions updated for better customer browsing.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Customer Activity</p>
                  <p className="mt-1.5 text-sm font-semibold">
                    {generatedImagesCount > 0 ? "Engaged" : "Waiting"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Saved try-on images are a good signal that shoppers are exploring products.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">AI Operations</p>
                  <p className="mt-1.5 text-sm font-semibold">
                    ${aiEstimatedCost.toFixed(4)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Track request volume and cost as you expand profile analysis and try-on usage.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle>Recent Customers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {recentCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent customer records found.</p>
                ) : (
                  recentCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-lg border bg-muted/20 p-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.mobile}</p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card size="sm">
            <CardHeader className="pb-2">
              <CardTitle>7 Day Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity data found.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Customers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-chart-3" />
                      <span className="text-muted-foreground">Try-ons</span>
                    </div>
                  </div>

                  <div className="grid h-48 grid-cols-7 gap-1">
                    {activityByDay.map((item) => (
                      <div key={item.label} className="flex min-w-0 flex-col items-center gap-1">
                        <div className="flex flex-1 items-end gap-0.5">
                          <div
                            className="w-3.5 rounded-t-md bg-primary"
                            style={{
                              height: `${Math.max(8, (item.customers / maxActivityValue) * 100)}%`,
                            }}
                            title={`${item.label}: ${item.customers} customers`}
                          />
                          <div
                            className="w-3.5 rounded-t-md bg-chart-3"
                            style={{
                              height: `${Math.max(8, (item.tryOns / maxActivityValue) * 100)}%`,
                            }}
                            title={`${item.label}: ${item.tryOns} try-ons`}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.customers}/{item.tryOns}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
