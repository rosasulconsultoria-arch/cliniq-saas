import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PacienteForm } from '@/components/pacientes/form'
import { mascaraCPF, mascaraTelefone } from '@/lib/utils'
import { format } from 'date-fns'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarPacientePage(props: Props) {
  const params = await props.params;
  const db = getTenantDb()
  const paciente = await db.paciente.findUnique({ where: { id: params.id } })
  if (!paciente) notFound()

  const defaultValues = {
    nome: paciente.nome,
    cpf: paciente.cpf ? mascaraCPF(paciente.cpf) : '',
    telefone: paciente.telefone ? mascaraTelefone(paciente.telefone) : '',
    email: paciente.email ?? '',
    dataNascimento: paciente.dataNascimento
      ? format(paciente.dataNascimento, 'yyyy-MM-dd')
      : '',
    genero: paciente.genero ?? '',
    endereco: (paciente as any).endereco ?? '',
    numero: (paciente as any).numero ?? '',
    complemento: (paciente as any).complemento ?? '',
    bairro: (paciente as any).bairro ?? '',
    cidade: (paciente as any).cidade ?? '',
    estado: (paciente as any).estado ?? '',
    cep: (paciente as any).cep ?? '',
    observacoes: paciente.observacoes ?? '',
    ativo: paciente.ativo,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pacientes"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{paciente.nome}</h1>
          <p className="text-sm text-muted-foreground">Editar dados do paciente</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Paciente</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <PacienteForm defaultValues={defaultValues} isEdit id={params.id} />
        </CardContent>
      </Card>
    </div>
  )
}
