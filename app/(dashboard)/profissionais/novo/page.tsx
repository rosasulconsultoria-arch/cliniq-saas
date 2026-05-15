import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProfissionalForm } from '@/components/profissionais/form'

export default function NovoProfissionalPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profissionais"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Profissional</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados para cadastrar um novo profissional</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Profissional</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfissionalForm />
        </CardContent>
      </Card>
    </div>
  )
}
