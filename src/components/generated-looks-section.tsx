/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { ArrowUpRight, ImageIcon, Sparkles } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type GeneratedLook = {
  id: string
  productId: number
  generatedImageUrl: string
  createdAt: string
  productName: string
  productImageUrl: string
}

type GeneratedLooksSectionProps = {
  generatedLooks: GeneratedLook[]
  generatedImageCount: number
  generatedImageLimit: number
}

export function GeneratedLooksSection({
  generatedLooks,
  generatedImageCount,
  generatedImageLimit,
}: GeneratedLooksSectionProps) {
  return (
    <section className="mt-10 space-y-5 border-t pt-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Saved try-on gallery</p>
          <h2 className="text-2xl font-semibold tracking-tight">Generated Images</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your saved outfit previews across products, ready to revisit when you compare styles or come back to buy later.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Saved looks</p>
            <p className="mt-1 text-base font-semibold">{generatedLooks.length}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Usage</p>
            <p className="mt-1 text-base font-semibold">
              {generatedImageCount} / {generatedImageLimit}
            </p>
          </div>
        </div>
      </div>

      {generatedLooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full border bg-background">
            <ImageIcon className="size-5 text-muted-foreground" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">No generated images yet</p>
            <p className="text-sm text-muted-foreground">
              Generate a try-on from a product page and it will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {generatedLooks.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={item.generatedImageUrl}
                    alt={item.productName}
                    className="h-80 w-full object-cover"
                  />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm">
                    <Sparkles className="size-3.5" />
                    Saved look
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="break-words text-base font-semibold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        Generated {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href={`/products/${item.productId}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>

                  {item.productImageUrl ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                      <img
                        src={item.productImageUrl}
                        alt={item.productName}
                        className="h-16 w-16 rounded-md object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Product</p>
                        <p className="truncate text-sm font-medium">{item.productName}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
