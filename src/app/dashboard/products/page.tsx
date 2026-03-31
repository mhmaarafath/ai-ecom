/* eslint-disable @next/next/no-img-element */
"use client"

import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ProductForm = {
  name: string
  imageFile: File | null
  imagePreview: string
  existingImageUrl: string
  description: string
  price: string
}

type Product = {
  id: number
  name: string
  imageUrl: string
  description: string
  price: number
}

const emptyForm: ProductForm = {
  name: "",
  imageFile: null,
  imagePreview: "",
  existingImageUrl: "",
  description: "",
  price: "",
}

export default function DashboardProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [mode, setMode] = useState<"add" | "edit">("add")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false)
  const [detailsReady, setDetailsReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const loadProducts = async () => {
    setIsLoading(true)
    setErrorMessage("")
    try {
      const response = await fetch("/api/products", { cache: "no-store" })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Failed to load products")
        setProducts([])
        return
      }

      setProducts(payload.products ?? [])
    } catch {
      setErrorMessage("Network error while loading products")
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const startAdd = () => {
    setMode("add")
    setEditingId(null)
    setForm(emptyForm)
    setDetailsReady(false)
    setIsModalOpen(true)
  }

  const startEdit = (id: number) => {
    const product = products.find((item) => item.id === id)
    if (!product) return

    setMode("edit")
    setEditingId(id)
    setForm({
      name: product.name,
      imageFile: null,
      imagePreview: product.imageUrl,
      existingImageUrl: product.imageUrl,
      description: product.description,
      price: product.price.toString(),
    })
    setDetailsReady(true)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setMode("add")
    setIsGeneratingSuggestion(false)
    setDetailsReady(false)
  }

  const onImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    void handleImageUpload(event)
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const imageUrl = URL.createObjectURL(file)
    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: imageUrl,
    }))
    setIsGeneratingSuggestion(true)
    setDetailsReady(false)

    try {
      const requestBody = new FormData()
      requestBody.append("image", file)

      const response = await fetch("/api/products/suggest", {
        method: "POST",
        body: requestBody,
      })
      const payload = await response.json()
      console.log("AI suggestion response:", payload)

      if (response.ok && payload.suggestion) {
        setForm((prev) => ({
          ...prev,
          name: payload.suggestion.name || prev.name,
          description: payload.suggestion.description || prev.description,
        }))
        setDetailsReady(true)
      } else {
        setDetailsReady(true)
      }
    } catch (error) {
      console.error("AI suggestion failed:", error)
      setDetailsReady(true)
    } finally {
      setIsGeneratingSuggestion(false)
    }
  }

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void saveProduct()
  }

  const saveProduct = async () => {
    const parsedPrice = Number(form.price)
    if (!form.name || !form.description || Number.isNaN(parsedPrice)) {
      return
    }

    if (mode === "add" && !form.imageFile) {
      return
    }

    setIsSaving(true)
    setErrorMessage("")
    try {
      const requestBody = new FormData()
      requestBody.append("name", form.name)
      requestBody.append("description", form.description)
      requestBody.append("price", String(parsedPrice))

      if (form.imageFile) {
        requestBody.append("image", form.imageFile)
      }
      if (mode === "edit") {
        requestBody.append("existingImageUrl", form.existingImageUrl)
      }

      const url =
        mode === "add" ? "/api/products" : `/api/products/${editingId ?? ""}`
      const method = mode === "add" ? "POST" : "PUT"
      const response = await fetch(url, {
        method,
        body: requestBody,
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Failed to save product")
        return
      }

      const savedProduct = payload.product as Product
      if (mode === "add") {
        setProducts((prev) => [savedProduct, ...prev])
      } else {
        setProducts((prev) =>
          prev.map((product) =>
            product.id === savedProduct.id ? savedProduct : product
          )
        )
      }
      closeModal()
    } catch {
      setErrorMessage("Network error while saving product")
    } finally {
      setIsSaving(false)
    }
  }

  const showDetailsFields = mode === "edit" || detailsReady

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
                <BreadcrumbPage>Products</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="p-4 pt-0">
          <div className="rounded-xl border bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <h1 className="text-lg font-semibold">Products</h1>
                <p className="text-sm text-muted-foreground">
                  Data from Supabase products table
                </p>
              </div>
              <Button onClick={startAdd}>Add Product</Button>
            </div>

            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                if (!open) closeModal()
                else setIsModalOpen(true)
              }}
            >
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {mode === "add" ? "Add Product" : "Edit Product"}
                  </DialogTitle>
                  <DialogDescription>
                    Fill name, image, description and price.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={submitForm} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Upload Image</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={onImageUpload}
                      required={mode === "add" && !form.imageFile}
                    />
                    {isGeneratingSuggestion ? (
                      <p className="text-xs text-muted-foreground">
                        Recognizing image and generating title + description...
                      </p>
                    ) : null}
                  </div>

                  {form.imagePreview ? (
                    <div className="rounded-md border p-2">
                      <img
                        src={form.imagePreview}
                        alt="Product preview"
                        className="h-28 w-28 rounded-md object-cover"
                      />
                    </div>
                  ) : null}

                  {showDetailsFields ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          Product Name
                          {isGeneratingSuggestion ? (
                            <span className="text-xs text-muted-foreground">
                              Generating...
                            </span>
                          ) : null}
                        </Label>
                        <Input
                          id="name"
                          placeholder="Ruby Flare Dress"
                          value={form.name}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="flex items-center gap-2">
                          Description
                          {isGeneratingSuggestion ? (
                            <span className="text-xs text-muted-foreground">
                              Generating...
                            </span>
                          ) : null}
                        </Label>
                        <Input
                          id="description"
                          placeholder="Elegant dress for evening events."
                          value={form.description}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          placeholder="49.99"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.price}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, price: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={isSaving || isGeneratingSuggestion}>
                          {mode === "add" ? "Save Product" : "Update Product"}
                        </Button>
                        <Button type="button" variant="outline" onClick={closeModal}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={closeModal}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </form>
              </DialogContent>
            </Dialog>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product Name</th>
                    <th className="px-4 py-3 font-medium">Image</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="border-t">
                      <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr className="border-t">
                      <td className="px-4 py-4 text-muted-foreground" colSpan={5}>
                        No products yet. Add your first product.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                    <tr key={product.id} className="border-t">
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-10 w-10 rounded-md border bg-white p-1 object-cover"
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {product.description}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(product.id)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {errorMessage ? (
              <p className="border-t px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
