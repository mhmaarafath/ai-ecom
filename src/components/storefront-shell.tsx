"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BadgeCheck, LogOut, Shirt, Sparkles, Truck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Separator } from "@/components/ui/separator"

type StorefrontShellProps = {
  children: React.ReactNode
  currentUser?: {
    id: string
    name: string
    mobileNumber: string
    profileImageUrl: string | null
  } | null
}

const shopLinks = [
  { href: "/", label: "New In" },
  { href: "/", label: "Dresses" },
  { href: "/", label: "Occasion Wear" },
]

const footerGroups = [
  {
    title: "Shop",
    links: [
      { href: "/", label: "New arrivals" },
      { href: "/", label: "Best sellers" },
      { href: "/", label: "Party edits" },
      { href: "/", label: "Everyday styles" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/login", label: "Orders" },
      { href: "/login", label: "Returns" },
      { href: "/login", label: "Delivery" },
      { href: "/login", label: "Contact" },
    ],
  },
]

type ProfileMenuProps = {
  currentUser: NonNullable<StorefrontShellProps["currentUser"]>
  isLoggingOut: boolean
  onProfile: () => void
  onLogout: () => void
  menuWidthClassName?: string
}

function ProfileMenu({
  currentUser,
  isLoggingOut,
  onProfile,
  onLogout,
  menuWidthClassName = "min-w-48",
}: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          <AvatarImage src={currentUser.profileImageUrl ?? undefined} alt={currentUser.name} />
          <AvatarFallback>{currentUser.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Open profile menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={`${menuWidthClassName} rounded-lg`} align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-left">
            <div className="truncate text-sm font-medium">{currentUser.name}</div>
            <div className="truncate text-xs text-muted-foreground">{currentUser.mobileNumber}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onProfile}>Profile</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onLogout} disabled={isLoggingOut}>
          <LogOut className="size-4" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StorefrontShell({ children, currentUser = null }: StorefrontShellProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const profileHref = currentUser ? "/profile" : "/login"
  const accountLinks = [
    { href: profileHref, label: "My profile" },
    { href: profileHref, label: "Profile selfie" },
    { href: "/products", label: "Collections" },
    { href: "/login", label: "Sign in" },
  ]

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="border-b bg-muted/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4" />
                Island-wide delivery
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="size-4" />
                Verified styles and sizing
              </span>
            </div>
            <div className="inline-flex items-center gap-2 text-foreground">
              <Sparkles className="size-4" />
              Profile-based shopping
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shirt className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold tracking-tight">AI Ecom</p>
                  <p className="text-sm text-muted-foreground">Modern fashion edits</p>
                </div>
              </Link>

              {currentUser ? (
                <div className="lg:hidden">
                  <ProfileMenu
                    currentUser={currentUser}
                    isLoggingOut={isLoggingOut}
                    onProfile={() => router.push("/profile")}
                    onLogout={() => void logout()}
                    menuWidthClassName="min-w-44"
                  />
                </div>
              ) : (
                <Link href="/login" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium lg:hidden">
                  Sign in
                </Link>
              )}
            </div>

            <div className="flex flex-1 items-center justify-end">
              {currentUser ? (
                <div className="hidden lg:flex">
                  <ProfileMenu
                    currentUser={currentUser}
                    isLoggingOut={isLoggingOut}
                    onProfile={() => router.push("/profile")}
                    onLogout={() => void logout()}
                  />
                </div>
              ) : (
                <div className="hidden items-center gap-2 lg:flex">
                  <Link href="/login" className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium">
                    Sign in
                  </Link>
                  <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                    Join now
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <NavigationMenu className="max-w-full justify-start">
              <NavigationMenuList className="flex-wrap justify-start gap-1">
                {shopLinks.map((link) => (
                  <NavigationMenuItem key={link.label}>
                    <NavigationMenuLink render={<Link href={link.href} />} className="rounded-full px-3 py-2">
                      {link.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border px-3 py-1.5">New season</span>
              <span className="rounded-full border px-3 py-1.5">Profile-ready shopping</span>
              <span className="rounded-full border px-3 py-1.5">Easy reorders</span>
            </div>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1.6fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shirt className="size-5" />
                </span>
                <div>
                  <p className="text-lg font-semibold tracking-tight">AI Ecom</p>
                  <p className="text-sm text-muted-foreground">Sharper fashion browsing with AI-led discovery.</p>
                </div>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Browse curated pieces, compare styles faster, and keep your saved profile ready for quicker try-ons and reorders.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {[...footerGroups, { title: "Account", links: accountLinks }].map((group) => (
                <div key={group.title} className="space-y-3">
                  <h2 className="text-sm font-semibold">{group.title}</h2>
                  <div className="space-y-2">
                    {group.links.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>© 2026 AI Ecom. Built for modern fashion shopping.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/" className="transition-colors hover:text-foreground">
                Browse collection
              </Link>
              <Link href={profileHref} className="transition-colors hover:text-foreground">
                Profile
              </Link>
              <Link href={profileHref} className="transition-colors hover:text-foreground">
                {currentUser ? "My account" : "Sign in"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
