'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SlugInput } from './SlugInput'
import { clinicaSchema, type ClinicaData } from '@/lib/signup/validators'
import { salvarClinica } from '@/app/(public)/signup/actions'
import { slugify } from '@/lib/signup/slug'
import { ESPECIALIDADE_LABELS, ESPECIALIDADES } from '@/lib/specialities'
import { Loader2 } from 'lucide-react'

export function ClinicaForm() {
  const router = useRouter()
  const [slugAvailable, setSlugAvailable] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ClinicaData>({
    resolver: zodResolver(clinicaSchema),
    defaultValues: { nomeClinica: '', slug: '', especialidade: undefined, telefone: '' },
  })

  const handleNomeBlur = () => {
    const nome = form.getValues('nomeClinica')
    if (nome && !form.getValues('slug')) {
      form.setValue('slug', slugify(nome))
    }
  }

  const handleSlugChange = useCallback(
    (val: string) => form.setValue('slug', val, { shouldValidate: true }),
    [form]
  )

  const onSubmit = (data: ClinicaData) => {
    if (!slugAvailable) return
    startTransition(async () => {
      const result = await salvarClinica(data)
      if (result.success) {
        router.push('/signup/admin')
      } else if (result.errors) {
        Object.entries(result.errors).forEach(([field, msgs]) => {
          if (field !== '_form') {
            form.setError(field as keyof ClinicaData, { message: msgs[0] })
          }
        })
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="nomeClinica"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da clínica</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: Clínica Bem Estar"
                  onBlur={handleNomeBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço da clínica</FormLabel>
              <FormControl>
                <SlugInput
                  value={field.value}
                  onChange={handleSlugChange}
                  onStatusChange={setSlugAvailable}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="especialidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Especialidade</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a especialidade" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ESPECIALIDADES.map((esp) => (
                    <SelectItem key={esp} value={esp}>
                      {ESPECIALIDADE_LABELS[esp]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(11) 99999-9999" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !slugAvailable || !form.formState.isValid}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Continuar →'
          )}
        </Button>
      </form>
    </Form>
  )
}
