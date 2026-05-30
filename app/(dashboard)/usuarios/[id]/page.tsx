import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UsuarioForm } from '@/components/usuarios/form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarUsuarioPage(props: Props) {
  const params = await props.params;
  const { id: tenantId } = await getCurrentTenant()
  const usuario = await runWithTenant(tenantId, async () => {
    const db = getTenantDb()
    return db.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, role: true, active: true },
    })
  })
  if (!usuario) notFound()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/usuarios"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{usuario.name}</h1>
          <p className="text-sm text-muted-foreground">Editar dados do usuário</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Usuário</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <UsuarioForm
            defaultValues={{
              name: usuario.name,
              email: usuario.email,
              role: usuario.role as any,
              active: usuario.active,
            }}
            isEdit
            id={params.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
