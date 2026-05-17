import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfigForm } from '@/components/configuracoes/config-form'

export default async function ConfiguracoesPage() {
  const session = await auth()
  const user = session?.user

  const config = await db.configClinica.findUnique({ where: { id: 'default' } }) ?? {
    id: 'default',
    nome: 'Clínica de Psicologia',
    logoBase64: null,
    corPrimaria: '#4f46e5',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Personalização e informações do sistema</p>
      </div>

      <ConfigForm
        initialNome={config.nome}
        initialCor={config.corPrimaria}
        initialLogo={config.logoBase64 ?? null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minha Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">{user?.name ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Perfil</span>
            <Badge variant="outline">{user?.role ?? '—'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm text-muted-foreground">Versão</span>
            <span className="text-sm font-medium">0.1.0</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Ambiente</span>
            <Badge variant="outline" className="border-emerald-400 text-emerald-600">Produção</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
