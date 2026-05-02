const DEFAULT_GENERATED_IMAGE_LIMIT = 10

export function getGeneratedImageLimit(): number {
  const rawValue = process.env.GENERATED_IMAGE_LIMIT
  const parsedValue = Number(rawValue)

  if (!rawValue || Number.isNaN(parsedValue) || parsedValue < 0) {
    return DEFAULT_GENERATED_IMAGE_LIMIT
  }

  return Math.floor(parsedValue)
}
