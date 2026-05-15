import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UsuarioForm } from '@/components/usuarios/form'

export default function NovoUsuarioPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/usuarios"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo Usuário</h1>
          <p className="text-sm text-muted-foreground">Crie um novo acesso ao sistema</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Usuário</CardTitle>
          <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <UsuarioForm />
        </CardContent>
      </Card>
    </div>
  )
}
