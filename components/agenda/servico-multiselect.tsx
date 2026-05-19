'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { getServicosAtivos } from '@/app/(dashboard)/servicos/actions'
import { cn } from '@/lib/utils'

interface Servico { id: string; nome: string }

interface Props {
  value: string[]
  onChange: (ids: string[]) => void
}

export function ServicoMultiselect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])

  useEffect(() => {
    getServicosAtivos().then(setServicos)
  }, [])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  const selectedNames = servicos.filter(s => value.includes(s.id)).map(s => s.nome)

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground truncate">
              {selectedNames.length === 0
                ? 'Selecionar serviços…'
                : `${selectedNames.length} serviço(s) selecionado(s)`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-2">
            Serviços prestados
          </p>
          <div className="space-y-0.5">
            {servicos.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">Carregando…</p>
            )}
            {servicos.map(s => (
              <button
                key={s.id}
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded text-sm text-left hover:bg-muted transition-colors',
                  value.includes(s.id) && 'bg-indigo-50 dark:bg-indigo-950/30',
                )}
                onClick={() => toggle(s.id)}
              >
                <div className={cn(
                  'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                  value.includes(s.id)
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-input',
                )}>
                  {value.includes(s.id) && <Check className="h-3 w-3 text-white" />}
                </div>
                <Tag className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                {s.nome}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((nome, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
              onClick={() => toggle(servicos.find(s => s.nome === nome)!.id)}
            >
              {nome} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
