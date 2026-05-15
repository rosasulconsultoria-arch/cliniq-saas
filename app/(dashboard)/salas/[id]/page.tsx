import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SalaForm } from '@/components/salas/form'

interface Props {
  params: { id: string }
}

export default async function EditarSalaPage({ params }: Props) {
  const sala = await db.sala.findUnique({ where: { id: params.id } })
  if (!sala) notFound()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/salas"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{sala.nome}</h1>
          <p className="text-sm text-muted-foreground">Editar dados da sala</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Sala</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <SalaForm
            defaultValues={{
              nome: sala.nome,
              capacidade: sala.capacidade,
              descricao: sala.descricao ?? '',
              ativa: sala.ativa,
            }}
            isEdit
            id={params.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
