import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LocalForm } from '@/components/locais/form'

interface Props {
  params: { id: string }
}

export default async function EditarLocalPage({ params }: Props) {
  const db = getTenantDb()
  const local = await db.local.findUnique({ where: { id: params.id } })
  if (!local) notFound()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/locais"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{local.nome}</h1>
          <p className="text-sm text-muted-foreground">Editar dados do local</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Local</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <LocalForm
            defaultValues={{
              nome:        local.nome,
              tipo:        local.tipo,
              capacidade:  local.capacidade ?? undefined,
              descricao:   local.descricao  ?? '',
              endereco:    local.endereco   ?? '',
              linkPadrao:  local.linkPadrao ?? '',
              instrucoes:  local.instrucoes ?? '',
              ativa:       local.ativa,
            }}
            isEdit
            id={params.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
