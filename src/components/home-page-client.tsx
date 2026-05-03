/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Product = {
  id: number
  name: string
  imageUrl: string
  description: string
  price: number
}

export function HomePageClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true)
      setError("")
      try {
        const response = await fetch("/api/products", { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          setError(payload.message ?? "Failed to load products")
          setProducts([])
          return
        }

        setProducts(payload.products ?? [])
      } catch {
        setError("Network error while loading products")
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <section id="shop" className="mb-8">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search dresses, colors, silhouettes"
            className="h-11 rounded-lg bg-muted/30 pl-9"
            aria-label="Search products"
          />
        </div>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading products...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products found.</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="group block">
              <Card className="overflow-hidden border-border/70 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-64 w-full object-cover"
                />
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <p className="shrink-0 text-base font-semibold">${product.price.toFixed(2)}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ready to view</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      Shop now
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
