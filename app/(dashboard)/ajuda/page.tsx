import { auth } from '@/lib/auth'
import { HelpCircle, Shield, User } from 'lucide-react'
import { AjudaAdmin } from '@/components/ajuda/ajuda-admin'
import { AjudaProfissional } from '@/components/ajuda/ajuda-profissional'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function AjudaPage() {
  const session = await auth()
  const role = session?.user?.role ?? 'RECEPCAO'
  const isAdmin = role === 'ADMIN'

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Ajuda</h1>
          <p className="text-sm text-muted-foreground">
            Encontre respostas sobre como usar o sistema
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="admin">
          <TabsList className="mb-6">
            <TabsTrigger value="admin" className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Administrador
            </TabsTrigger>
            <TabsTrigger value="profissional" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Profissional
            </TabsTrigger>
          </TabsList>
          <TabsContent value="admin">
            <AjudaAdmin />
          </TabsContent>
          <TabsContent value="profissional">
            <AjudaProfissional />
          </TabsContent>
        </Tabs>
      ) : (
        <AjudaProfissional />
      )}
    </div>
  )
}
