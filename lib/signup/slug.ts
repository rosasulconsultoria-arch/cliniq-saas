export const SLUGS_RESERVADOS = [
  'admin', 'api', 'www', 'app', 'auth', 'billing', 'signup', 'login',
  'dashboard', 'cliniq', 'suporte', 'contato', 'agendar', 'blog',
  'ajuda', 'status', 'demo', 'teste',
] as const

/**
 * Check if a slug is reserved (case-insensitive)
 */
export function isReservedSlug(slug: string): boolean {
  return SLUGS_RESERVADOS.includes(slug.toLowerCase() as any)
}

/**
 * Convert text to URL-safe slug
 * - Normalize accents (é→e, ã→a, ç→c, etc.)
 * - Lowercase
 * - Remove non-alphanumeric except hyphens
 * - Replace spaces/multiple hyphens with single hyphen
 * - Strip leading/trailing hyphens
 */
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate up to 3 slug suggestions from a base slug
 * Filters out occupied slugs and reserved slugs
 */
export function generateSlugSuggestions(
  baseSlug: string,
  occupiedSlugs: string[]
): string[] {
  const occupied = new Set(occupiedSlugs.map(s => s.toLowerCase()))
  const reserved = new Set(SLUGS_RESERVADOS.map(s => s.toLowerCase()))

  const candidates = [
    `${baseSlug}-2`,
    `${baseSlug}-3`,
    `${baseSlug}-4`,
    `${baseSlug}-sp`,
    `${baseSlug}-rj`,
    `${baseSlug}-co`,
  ]

  const suggestions: string[] = []
  for (const candidate of candidates) {
    if (!occupied.has(candidate.toLowerCase()) && !reserved.has(candidate.toLowerCase())) {
      suggestions.push(candidate)
      if (suggestions.length >= 3) break
    }
  }

  return suggestions
}
