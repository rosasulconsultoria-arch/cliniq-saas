'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { adminSchema, type AdminData } from '@/lib/signup/validators'
import { salvarAdmin } from '@/app/(public)/signup/actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

export function AdminForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<AdminData>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      nomeAdmin: '',
      emailAdmin: '',
      senha: '',
      confirmacaoSenha: '',
      termosAceitos: false as unknown as true,
    },
  })

  const senhaValue = form.watch('senha')

  const onSubmit = (data: AdminData) => {
    startTransition(async () => {
      const result = await salvarAdmin(data)
      if (result.success) {
        router.push('/signup/verificar')
      } else if (result.errors) {
        Object.entries(result.errors).forEach(([field, msgs]) => {
          if (field !== '_form') {
            form.setError(field as keyof AdminData, { message: msgs[0] })
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
          name="nomeAdmin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: João da Silva" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emailAdmin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="seu@email.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="senha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              {senhaValue && <PasswordStrengthMeter password={senhaValue} />}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmacaoSenha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termosAceitos"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal leading-snug text-muted-foreground">
                Aceito os{' '}
                <Link
                  href="/termos"
                  target="_blank"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link
                  href="/privacidade"
                  target="_blank"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Política de Privacidade
                </Link>
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isPending || !form.formState.isValid}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Próximo: verificar email'
          )}
        </Button>
      </form>
    </Form>
  )
}
