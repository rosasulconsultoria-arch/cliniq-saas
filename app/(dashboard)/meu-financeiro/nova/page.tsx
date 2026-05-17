import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DespesaForm } from '@/components/meu-financeiro/despesa-form'

export default function NovaDespesaPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/meu-financeiro"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Despesa</h1>
          <p className="text-sm text-muted-foreground">Registre uma despesa pessoal</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Despesa</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <DespesaForm />
        </CardContent>
      </Card>
    </div>
  )
}
