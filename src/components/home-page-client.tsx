/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

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
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-8 flex items-center justify-between border-b pb-4">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink render={<a href="#shop" />}>
                Shop
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="/color-match" />}>
                Face Tone Match
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <Button render={<Link href="/login" />}>
          Login
        </Button>
      </header>

      <section id="shop" className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Dress Collection</h1>
        <p className="text-sm text-muted-foreground">
          Explore available products
        </p>
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
            <Card key={product.id} className="overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-48 w-full object-cover"
              />
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <p className="text-base font-semibold">${product.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section id="color-match" className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="text-xl font-semibold tracking-tight">
          Upload Selfie for Color Match
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Find dress colors that best complement your face tone.
        </p>
        <Button className="mt-4" render={<Link href="/color-match" />}>
          Open Color Match Page
        </Button>
      </section>
    </main>
  )
}
