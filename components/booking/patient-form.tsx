'use client'

import { useState, useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, UserCheck } from 'lucide-react'
import { mascaraCPF, mascaraTelefone, validarCPF } from '@/lib/utils'
import { buscarPacientePorCPF } from '@/app/(public)/agendar/[slug]/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const schema = z.object({
  cpf: z.string().refine((v) => validarCPF(v.replace(/\D/g, '')), 'CPF inválido'),
  nome: z.string().min(2, 'Nome obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onSubmit: (data: FormData) => void
  isSubmitting?: boolean
}

export function PatientForm({ onSubmit, isSubmitting }: Props) {
  const [pacienteEncontrado, setPacienteEncontrado] = useState(false)
  const [isLookingUp, startLookup] = useTransition()

  const {
    register, control, handleSubmit, setValue, watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const cpf = watch('cpf') ?? ''

  // Lookup patient when CPF is complete
  useEffect(() => {
    const nums = cpf.replace(/\D/g, '')
    if (nums.length !== 11) { setPacienteEncontrado(false); return }
    startLookup(async () => {
      const p = await buscarPacientePorCPF(nums)
      if (p) {
        setValue('nome', p.nome)
        setValue('telefone', p.telefone ? mascaraTelefone(p.telefone) : '')
        setValue('email', p.email ?? '')
        if (p.dataNascimento) {
          const d = new Date(p.dataNascimento)
          setValue('dataNascimento', `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
        }
        setPacienteEncontrado(true)
      } else {
        setPacienteEncontrado(false)
      }
    })
  }, [cpf, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* CPF — primeiro campo, identifica o paciente */}
      <div className="space-y-1.5">
        <Label htmlFor="cpf" className="text-sm font-semibold">CPF *</Label>
        <Controller
          control={control}
          name="cpf"
          render={({ field }) => (
            <div className="relative">
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                inputMode="numeric"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(mascaraCPF(e.target.value))}
                maxLength={14}
                className={cn('text-lg h-12', errors.cpf ? 'border-destructive' : '')}
              />
              {isLookingUp && (
                <Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        />
        {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
      </div>

      {pacienteEncontrado && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          <UserCheck className="h-4 w-4 shrink-0" />
          Cadastro encontrado! Dados pré-preenchidos.
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="nome" className="text-sm font-semibold">Nome completo *</Label>
        <Input id="nome" placeholder="Seu nome completo" className="h-12" {...register('nome')} />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="telefone" className="text-sm font-semibold">Telefone / WhatsApp</Label>
          <Controller
            control={control}
            name="telefone"
            render={({ field }) => (
              <Input
                id="telefone"
                placeholder="(11) 99999-9999"
                inputMode="tel"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(mascaraTelefone(e.target.value))}
                maxLength={15}
                className="h-12"
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
          <Input id="email" type="email" placeholder="seu@email.com" className="h-12" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          <p className="text-xs text-muted-foreground">Confirmação será enviada por e-mail</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dataNascimento" className="text-sm font-semibold">Data de nascimento</Label>
        <Input id="dataNascimento" type="date" className="h-12" {...register('dataNascimento')} />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md"
      >
        {isSubmitting ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Confirmando...</>
        ) : (
          'Confirmar Agendamento →'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Ao confirmar, você concorda com os termos de agendamento da clínica.
      </p>
    </form>
  )
}
