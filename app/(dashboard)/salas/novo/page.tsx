import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SalaForm } from '@/components/salas/form'

export default function NovaSalaPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/salas"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova Sala</h1>
          <p className="text-sm text-muted-foreground">Cadastre uma nova sala para agendamentos</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Sala</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <SalaForm />
        </CardContent>
      </Card>
    </div>
  )
}
