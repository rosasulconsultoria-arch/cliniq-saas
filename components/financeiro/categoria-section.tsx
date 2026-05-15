'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Edit2, Check, X } from 'lucide-react'
import { criarCategoria, atualizarCategoria, deletarCategoria } from '@/app/(dashboard)/financeiro/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

const TIPO_LABELS = { RECEITA: 'Receitas', DESPESA: 'Despesas', INVESTIMENTO: 'Investimentos' }
const TIPO_CORES = { RECEITA: 'text-emerald-600', DESPESA: 'text-red-500', INVESTIMENTO: 'text-violet-600' }
const PALETA = ['#22c55e','#16a34a','#15803d','#ef4444','#dc2626','#b91c1c','#8b5cf6','#7c3aed','#6d28d9','#f59e0b','#d97706','#b45309','#3b82f6','#2563eb','#1d4ed8','#ec4899','#db2777','#be185d','#64748b','#475569','#334155']

interface Categoria { id: string; nome: string; cor: string }

interface Props {
  tipo: 'RECEITA' | 'DESPESA' | 'INVESTIMENTO'
  categorias: Categoria[]
}

export function CategoriaSection({ tipo, categorias: initial }: Props) {
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(PALETA[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCor, setEditCor] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAdd() {
    if (!nome.trim()) return
    startTransition(async () => {
      const result = await criarCategoria({ nome: nome.trim(), tipo, cor })
      if (result.error) { toast.error(result.error); return }
      toast.success('Categoria criada!')
      setNome('')
      router.refresh()
    })
  }

  function startEdit(c: Categoria) {
    setEditingId(c.id)
    setEditNome(c.nome)
    setEditCor(c.cor)
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      const result = await atualizarCategoria(id, { nome: editNome, tipo, cor: editCor })
      if (result.error) { toast.error(result.error); return }
      toast.success('Categoria atualizada!')
      setEditingId(null)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deletarCategoria(id)
        toast.success('Categoria excluída')
        router.refresh()
      } catch {
        toast.error('Não é possível excluir categoria com transações vinculadas.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`text-base font-semibold ${TIPO_CORES[tipo]}`}>
          {TIPO_LABELS[tipo]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* List */}
        {initial.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
            Nenhuma categoria. Adicione uma abaixo.
          </p>
        )}
        {initial.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border bg-background">
            {editingId === c.id ? (
              <>
                <input type="color" value={editCor} onChange={e => setEditCor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent" />
                <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-8 flex-1 text-sm" onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id)} autoFocus />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(c.id)} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: c.cor }} />
                <span className="text-sm flex-1">{c.nome}</span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)} disabled={isPending}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}

        {/* Add form */}
        <div className="flex items-center gap-2 pt-2">
          <div className="relative">
            <input type="color" value={cor} onChange={e => setCor(e.target.value)} className="h-9 w-9 rounded-lg cursor-pointer border border-border bg-transparent" title="Escolher cor" />
          </div>
          <Input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome da categoria..."
            className="flex-1 h-9"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={isPending || !nome.trim()} className="h-9">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Color palette */}
        <div className="flex flex-wrap gap-1.5">
          {PALETA.map(c => (
            <button key={c} type="button" className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${cor === c ? 'ring-2 ring-offset-1 ring-foreground' : ''}`} style={{ backgroundColor: c }} onClick={() => setCor(c)} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
