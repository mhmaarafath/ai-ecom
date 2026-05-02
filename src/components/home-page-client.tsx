/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
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

type HomePageClientProps = {
  currentUser?: {
    id: string
    name: string
    mobileNumber: string
    profileImageUrl: string | null
  } | null
}

export function HomePageClient({ currentUser = null }: HomePageClientProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

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

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser.mobileNumber}</p>
            </div>
            <Link href="/profile" className={buttonVariants({ variant: "outline" })}>
              Profile
            </Link>
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => void logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        ) : (
          <Link href="/login" className={buttonVariants()}>
            Login
          </Link>
        )}
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
            <Link key={product.id} href={`/products/${product.id}`} className="group block">
              <Card className="overflow-hidden transition-shadow group-hover:shadow-md">
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
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
