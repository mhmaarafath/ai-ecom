import type { Metadata } from "next"
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

type AiUsageLogRow = {
  id: number
  created_at: string
  source: string
  description: string
  request_type: "text" | "image"
  model: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost_usd: number
  currency: string
  metadata: Record<string, unknown> | null
}

export const metadata: Metadata = {
  title: "Admin AI Cost Logs",
  description: "Admin panel for AI usage, token spending, and estimated API costs.",
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatUsd(value: number) {
  return `$${value.toFixed(6)}`
}

function toMetadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata) return "-"
  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== "")
  if (entries.length === 0) return "-"
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ")
}

export default async function AdminAiCostsPage() {
  let rows: AiUsageLogRow[] = []

  try {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300)

    rows = (data as AiUsageLogRow[] | null) ?? []
  } catch {
    rows = []
  }

  const totalCost = rows.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0)
  const totalTokens = rows.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0)
  const textCalls = rows.filter((row) => row.request_type === "text").length
  const imageCalls = rows.filter((row) => row.request_type === "image").length

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>AI Cost Logs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatUsd(totalCost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatNumber(totalTokens)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Text Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatNumber(textCalls)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Image Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatNumber(imageCalls)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border bg-background">
            <div className="border-b px-4 py-3">
              <h1 className="text-lg font-semibold">Recent AI Usage Logs</h1>
              <p className="text-sm text-muted-foreground">
                Tokens, models, source endpoint, and estimated costs.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Input Tokens</th>
                    <th className="px-4 py-3 font-medium">Output Tokens</th>
                    <th className="px-4 py-3 font-medium">Total Tokens</th>
                    <th className="px-4 py-3 font-medium">Estimated Cost</th>
                    <th className="px-4 py-3 font-medium">Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr className="border-t">
                      <td colSpan={10} className="px-4 py-4 text-muted-foreground">
                        No usage logs found. Run any AI feature to populate this table.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.source}</td>
                        <td className="px-4 py-3 max-w-[260px]">{row.description}</td>
                        <td className="px-4 py-3 whitespace-nowrap uppercase">{row.request_type}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.model}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.input_tokens === null ? "-" : formatNumber(row.input_tokens)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.output_tokens === null ? "-" : formatNumber(row.output_tokens)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.total_tokens === null ? "-" : formatNumber(row.total_tokens)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatUsd(Number(row.estimated_cost_usd ?? 0))}
                        </td>
                        <td className="px-4 py-3 max-w-[320px] text-muted-foreground">
                          {toMetadataSummary(row.metadata)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
