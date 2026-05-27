import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CalendarRange } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LocalForm } from '@/components/locais/form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarLocalPage(props: Props) {
  const params = await props.params;
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
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Dados do Local</CardTitle>
            <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/locais/${params.id}/reservas`}>
              <CalendarRange className="mr-2 h-4 w-4" />
              Reservas
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <LocalForm
            defaultValues={{
              nome:        local.nome,
              tipo:        local.tipo,
              capacidade:  local.capacidade  ?? undefined,
              descricao:   local.descricao   ?? '',
              endereco:    local.endereco    ?? '',
              plataforma:  local.plataforma  ?? '',
              linkPadrao:  local.linkPadrao  ?? '',
              instrucoes:  local.instrucoes  ?? '',
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
