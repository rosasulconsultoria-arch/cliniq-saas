import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfissionalForm } from '@/components/profissionais/form'
import { DisponibilidadeTab } from '@/components/profissionais/disponibilidade-tab'
import { BloqueioTab } from '@/components/profissionais/bloqueio-tab'
import { ProfissionalQRCode } from '@/components/profissionais/qr-code'

interface Props {
  params: { id: string }
}

export default async function EditarProfissionalPage({ params }: Props) {
  const profissional = await db.profissional.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      disponibilidades: { orderBy: { diaSemana: 'asc' } },
      bloqueios: { orderBy: { dataHoraInicio: 'desc' }, take: 20 },
    },
  })

  if (!profissional) notFound()

  const defaultValues = {
    nome: profissional.user.name,
    email: profissional.user.email,
    especialidade: profissional.especialidade,
    crp: profissional.crp ?? '',
    tipoVinculo: profissional.tipoVinculo as 'COMISSIONADO' | 'LOCATARIO',
    comissaoPercentual: profissional.comissaoPercentual ? Number(profissional.comissaoPercentual) : null,
    valorAluguelMensal: profissional.valorAluguelMensal ? Number(profissional.valorAluguelMensal) : null,
    valorConsultaPadrao: profissional.valorConsultaPadrao ? Number(profissional.valorConsultaPadrao) : null,
    bio: profissional.bio ?? '',
    ativo: profissional.ativo,
  }

  const disponibilidadesSerializadas = profissional.disponibilidades.map((d) => ({
    id: d.id,
    diaSemana: d.diaSemana,
    horaInicio: d.horaInicio,
    horaFim: d.horaFim,
  }))

  const bloqueiosSerializados = profissional.bloqueios.map((b) => ({
    id: b.id,
    dataHoraInicio: b.dataHoraInicio.toISOString(),
    dataHoraFim: b.dataHoraFim.toISOString(),
    motivo: b.motivo,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profissionais"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profissional.user.name}</h1>
          <p className="text-sm text-muted-foreground">{profissional.especialidade}</p>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger>
          <TabsTrigger value="bloqueios">Bloqueios</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Profissional</CardTitle>
              <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfissionalForm
                defaultValues={defaultValues}
                isEdit
                id={params.id}
                slugAgendamento={profissional.slugAgendamento}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link de Agendamento Online</CardTitle>
              <CardDescription>Compartilhe este link para que pacientes agendem diretamente</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfissionalQRCode
                slug={profissional.slugAgendamento}
                appUrl={process.env.NEXT_PUBLIC_APP_URL}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disponibilidade">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disponibilidade de Atendimento</CardTitle>
              <CardDescription>Dias e horários em que o profissional atende</CardDescription>
            </CardHeader>
            <CardContent>
              <DisponibilidadeTab
                profissionalId={params.id}
                disponibilidadesIniciais={disponibilidadesSerializadas}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloqueios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloqueios de Agenda</CardTitle>
              <CardDescription>Férias, folgas e outros períodos indisponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <BloqueioTab
                profissionalId={params.id}
                bloqueiosIniciais={bloqueiosSerializados}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
