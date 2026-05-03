import type { Metadata } from "next"
import { Check, Palette, ScanFace, Shirt, Sparkles, Wand2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Features",
  description: "Discover the customer-facing shopping features available in AI Ecom.",
}

const featureCards = [
  {
    title: "Personal style profile",
    description:
      "Customers can upload a selfie and build a profile that helps guide what may suit them better.",
    icon: ScanFace,
  },
  {
    title: "Color guidance",
    description:
      "Shows which colors may work well, which ones to avoid, and what feels more flattering for the customer.",
    icon: Palette,
  },
  {
    title: "Style suggestions",
    description:
      "Offers direction on necklines, sleeves, fit, patterns, and outfit ideas based on the saved profile.",
    icon: Sparkles,
  },
  {
    title: "Virtual dress preview",
    description:
      "Customers can preview selected store dresses on themselves before making a decision.",
    icon: Shirt,
  },
  {
    title: "Saved looks",
    description:
      "Created looks are saved to the profile page so customers can come back to them later.",
    icon: Wand2,
  },
  {
    title: "Faster product setup",
    description:
      "Store teams can prepare product titles and descriptions faster from product images.",
    icon: Check,
  },
]

const highlights = [
  "Takes the hassle out of deciding what may look good.",
  "Helps customers shop with more confidence.",
  "Makes dress discovery feel more personal.",
  "Lets customers preview before they commit.",
]

export default function FeaturesPage() {
  return (
    <main className="bg-background">
      <section className="border-b bg-muted/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 md:py-16">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Features
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              A more personal way to shop for fashion
            </h1>
            <p className="text-base leading-7 text-muted-foreground md:text-lg">
              Customers can upload a selfie, understand which colors and styles may suit
              them better, and preview selected dresses before buying. The whole flow is
              designed to make shopping faster, clearer, and more confident.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
