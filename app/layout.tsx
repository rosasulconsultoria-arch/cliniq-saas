import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import './globals.css'
import { Providers } from '@/components/providers'
import { runWithTenant } from '@/lib/tenant-context'
import { getTenantBySlug } from '@/lib/tenant-lookup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Sistema de Gestão — Clínica',
    template: '%s — Clínica',
  },
  description: 'Sistema de gestão para clínica de psicologia',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Neuroconexão',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Next.js 14: headers() é síncrono. Em Next.js 15+, usar await headers()
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')

  // Sem slug = request chegou sem passar pelo middleware (ou root domain)
  // O middleware já deveria ter redirecionado — este notFound() é defesa em profundidade
  if (!slug) return notFound()

  // Busca tenant por slug com cache de 5 minutos (ver lib/tenant-lookup.ts)
  const tenant = await getTenantBySlug(slug)

  if (!tenant) return notFound()

  // Estabelece contexto de tenant via AsyncLocalStorage para toda a árvore de
  // Server Components desta request. Server Actions precisam de withTenantAction()
  // separadamente (POST requests têm seu próprio contexto de execução).
  // Ver docs/server-actions-pattern.md e docs/tenant-routing.md.
  return runWithTenant(tenant.id, () => (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  ))
}
