'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, CreditCard, Loader2 } from 'lucide-react'
import { finalizarSignup } from '../actions'

// ─── Máscaras de input ────────────────────────────────────────────────────────

function mascaraCartao(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function mascaraValidade(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`
  return d
}

function mascaraCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function mascaraCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`
  return d
}

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface CartaoFormProps {
  nomePlano: string
  valorFormatado: string
}

export function CartaoForm({ nomePlano, valorFormatado }: CartaoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [holderName, setHolderName] = useState('')
  const [numero, setNumero] = useState('')
  const [validade, setValidade] = useState('')
  const [cvv, setCvv] = useState('')
  const [cpf, setCpf] = useState('')
  const [cep, setCep] = useState('')
  const [enderecoNum, setEnderecoNum] = useState('')
  const [telefone, setTelefone] = useState('')
  const [termos, setTermos] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const validadePartes = validade.replace(/\D/g, '')
  const expiryMonth = validadePartes.slice(0, 2)
  const expiryYear = validadePartes.slice(2, 4)

  const formValido =
    holderName.trim().length >= 2 &&
    numero.replace(/\s/g, '').length === 16 &&
    expiryMonth.length === 2 &&
    expiryYear.length === 2 &&
    cvv.length >= 3 &&
    cpf.replace(/\D/g, '').length === 11 &&
    cep.replace(/\D/g, '').length === 8 &&
    enderecoNum.trim().length >= 1 &&
    telefone.replace(/\D/g, '').length >= 10 &&
    termos

  const handleSubmit = () => {
    if (!formValido || isPending) return
    setErro(null)

    startTransition(async () => {
      const result = await finalizarSignup({
        holderName: holderName.trim(),
        number: numero.replace(/\s/g, ''),
        expiryMonth,
        expiryYear: `20${expiryYear}`,
        ccv: cvv,
        cpfCnpj: cpf.replace(/\D/g, ''),
        postalCode: cep.replace(/\D/g, ''),
        addressNumber: enderecoNum.trim(),
        phone: telefone.replace(/\D/g, ''),
      })

      if (result.success) {
        router.push('/signup/sucesso')
      } else {
        setErro(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Dados do cartão */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Dados do cartão</h2>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="holderName">Nome no cartão</Label>
            <Input
              id="holderName"
              placeholder="Como aparece no cartão"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="numero">Número do cartão</Label>
            <Input
              id="numero"
              placeholder="0000 0000 0000 0000"
              value={numero}
              onChange={(e) => setNumero(mascaraCartao(e.target.value))}
              inputMode="numeric"
              maxLength={19}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="validade">Validade</Label>
              <Input
                id="validade"
                placeholder="MM/AA"
                value={validade}
                onChange={(e) => setValidade(mascaraValidade(e.target.value))}
                inputMode="numeric"
                maxLength={5}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dados do titular */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">Dados do titular</h2>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cpf">CPF do titular</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(mascaraCPF(e.target.value))}
              inputMode="numeric"
              maxLength={14}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => setCep(mascaraCEP(e.target.value))}
                inputMode="numeric"
                maxLength={9}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="enderecoNum">Número</Label>
              <Input
                id="enderecoNum"
                placeholder="123"
                value={enderecoNum}
                onChange={(e) => setEnderecoNum(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
              inputMode="tel"
              maxLength={15}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Termos */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="termos"
          checked={termos}
          onCheckedChange={(v) => setTermos(v === true)}
          disabled={isPending}
        />
        <Label htmlFor="termos" className="cursor-pointer text-sm leading-snug text-muted-foreground">
          Confirmo que entendi que serei cobrado(a) {valorFormatado} após o trial de 14 dias do
          plano {nomePlano}, e posso cancelar a qualquer momento antes disso.
        </Label>
      </div>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full"
        disabled={!formValido || isPending}
        onClick={handleSubmit}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validando pagamento...
          </>
        ) : (
          'Começar meu trial gratuito'
        )}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Pagamentos seguros via Asaas. Não armazenamos dados do seu cartão.</span>
      </div>
    </div>
  )
}
