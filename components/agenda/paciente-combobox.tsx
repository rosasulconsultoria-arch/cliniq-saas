'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronsUpDown, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { buscarPacientes } from '@/app/(dashboard)/agenda/actions'
import { cn } from '@/lib/utils'

interface Paciente { id: string; nome: string; cpf: string | null }

interface Props {
  value: string
  onChange: (value: string, nome: string) => void
  onCadastrar?: (nome: string) => void
  placeholder?: string
}

export function PacienteCombobox({ value, onChange, onCadastrar, placeholder = 'Buscar cliente...' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Paciente[]>([])
  const [selectedNome, setSelectedNome] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSearch(q: string) {
    setQuery(q)
    if (q.length < 2) { setResultados([]); return }
    startTransition(async () => {
      const res = await buscarPacientes(q)
      setResultados(res)
    })
  }

  function handleSelect(paciente: Paciente) {
    setSelectedNome(paciente.nome)
    onChange(paciente.id, paciente.nome)
    setOpen(false)
    setQuery('')
  }

  function formatCpf(cpf: string) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value && selectedNome ? selectedNome : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite nome ou CPF..."

            value={query}
            onValueChange={handleSearch}
          />
          <CommandList>
            {isPending ? (
              <CommandEmpty>
                <Loader2 className="h-4 w-4 animate-spin mx-auto my-2" />
              </CommandEmpty>
            ) : query.length < 2 ? (
              <CommandEmpty>Digite pelo menos 2 caracteres</CommandEmpty>
            ) : resultados.length === 0 ? (
              <div className="py-2">
                <p className="text-sm text-center text-muted-foreground px-4 py-1">Nenhum cliente encontrado</p>
                {onCadastrar && (
                  <button
                    type="button"
                    className="mt-1 w-full flex items-center justify-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 py-2 px-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                    onClick={() => { onCadastrar(query); setOpen(false) }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Cadastrar &ldquo;{query}&rdquo; como cliente
                  </button>
                )}
              </div>
            ) : (
              <CommandGroup>
                {resultados.map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => handleSelect(p)}>
                    <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                    <div>
                      <p className="text-sm font-medium">{p.nome}</p>
                      {p.cpf && (
                        <p className="text-xs text-muted-foreground">{formatCpf(p.cpf)}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
