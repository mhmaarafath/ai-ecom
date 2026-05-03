"use client"

import type { AnalyzeResult } from "@/lib/color-match-types"
import { toTitleCase } from "@/lib/color-match-client-utils"

type ProfileAnalysisResultsSectionProps = {
  analysis: AnalyzeResult | null
}

export function ProfileAnalysisResultsSection({
  analysis,
}: ProfileAnalysisResultsSectionProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground">
      <div className="border-b px-5 py-4">
        <h3 className="text-lg font-semibold leading-snug">Style Match</h3>
        <p className="text-sm text-muted-foreground">
          Profile analysis, color direction, and outfit guidance from your saved selfie.
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">PROFILE</p>
          {analysis ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="mt-1 text-sm font-medium">{toTitleCase(analysis.gender)}</p>
              </div>
              <div className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">Face Shape</p>
                <p className="mt-1 text-sm font-medium">{toTitleCase(analysis.face_shape)}</p>
              </div>
              <div className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">Skin Tone</p>
                <p className="mt-1 text-sm font-medium">{toTitleCase(analysis.skin_tone)}</p>
              </div>
              <div className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">Undertone</p>
                <p className="mt-1 text-sm font-medium">{toTitleCase(analysis.undertone)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Upload an image to get profile analysis.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">RECOMMENDED COLORS</p>
          {analysis?.recommendations.colors?.length ? (
            <div className="flex flex-wrap gap-2">
              {analysis.recommendations.colors.map((color) => (
                <span key={`${color.name}-${color.hex}`} className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs ring-1 ring-foreground/10">
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: color.hex }}
                  />
                  {toTitleCase(color.name)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No colors yet.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">AVOID COLORS</p>
          {analysis?.recommendations.avoid_colors?.length ? (
            <div className="flex flex-wrap gap-2">
              {analysis.recommendations.avoid_colors.map((color) => (
                <span key={`${color.name}-${color.hex}`} className="inline-flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs text-destructive ring-1 ring-destructive/20">
                  <span
                    className="h-3 w-3 rounded-full border border-destructive/40"
                    style={{ backgroundColor: color.hex }}
                  />
                  {toTitleCase(color.name)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No avoid list yet.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">CLOTHING STYLE</p>
          {analysis?.recommendations.clothing ? (
            <div className="space-y-1 text-xs">
              <p><span className="font-medium">Neck:</span> {analysis.recommendations.clothing.neck.map(toTitleCase).join(", ")}</p>
              <p><span className="font-medium">Sleeve:</span> {analysis.recommendations.clothing.sleeve.map(toTitleCase).join(", ")}</p>
              <p><span className="font-medium">Fit:</span> {analysis.recommendations.clothing.fit.map(toTitleCase).join(", ")}</p>
              <p><span className="font-medium">Patterns:</span> {analysis.recommendations.clothing.patterns.map(toTitleCase).join(", ")}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No style guidance yet.</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-muted/35 p-4">
          <p className="text-xs font-medium text-muted-foreground">OUTFIT SUGGESTIONS</p>
          {analysis?.recommendations.outfits?.length ? (
            <div className="space-y-3">
              {analysis.recommendations.outfits.map((item, index) => (
                <div key={`${item.top}-${index}`} className="rounded-lg bg-background p-3 ring-1 ring-foreground/10">
                  <p className="text-sm font-medium">
                    {toTitleCase(item.top)} + {toTitleCase(item.bottom)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.colors}</p>
                  <p className="mt-2 text-xs">{item.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No outfits yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
