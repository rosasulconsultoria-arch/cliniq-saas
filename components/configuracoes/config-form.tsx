'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ImageUpload } from '@/components/ui/image-upload'
import { salvarConfigClinica, type ConfigClinicaData } from '@/app/(dashboard)/configuracoes/actions'

interface Props {
  initialNome: string
  initialCor: string
  initialLogo: string | null
  initialDados: {
    cnpj?: string | null
    endereco?: string | null
    numero?: string | null
    complemento?: string | null
    bairro?: string | null
    cidade?: string | null
    estado?: string | null
    cep?: string | null
    telefone?: string | null
    email?: string | null
  }
}

const CORES_SUGERIDAS = [
  { label: 'Índigo', value: '#4f46e5' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Roxo', value: '#7c3aed' },
  { label: 'Rosa', value: '#db2777' },
  { label: 'Laranja', value: '#ea580c' },
  { label: 'Ciano', value: '#0891b2' },
  { label: 'Ardósia', value: '#475569' },
]

function mascaraCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function mascaraCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

export function ConfigForm({ initialNome, initialCor, initialLogo, initialDados }: Props) {
  const [nome, setNome] = useState(initialNome)
  const [cor, setCor] = useState(initialCor)
  const [logo, setLogo] = useState<string | null>(initialLogo)
  const [cnpj, setCnpj] = useState(initialDados.cnpj ?? '')
  const [endereco, setEndereco] = useState(initialDados.endereco ?? '')
  const [numero, setNumero] = useState(initialDados.numero ?? '')
  const [complemento, setComplemento] = useState(initialDados.complemento ?? '')
  const [bairro, setBairro] = useState(initialDados.bairro ?? '')
  const [cidade, setCidade] = useState(initialDados.cidade ?? '')
  const [estado, setEstado] = useState(initialDados.estado ?? '')
  const [cep, setCep] = useState(initialDados.cep ?? '')
  const [telefone, setTelefone] = useState(initialDados.telefone ?? '')
  const [emailClinica, setEmailClinica] = useState(initialDados.email ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!nome.trim()) { toast.error('Nome da clínica obrigatório'); return }
    startTransition(async () => {
      const payload: ConfigClinicaData = {
        nome, corPrimaria: cor, logoBase64: logo,
        cnpj: cnpj || null, endereco: endereco || null, numero: numero || null,
        complemento: complemento || null, bairro: bairro || null, cidade: cidade || null,
        estado: estado || null, cep: cep || null,
        telefone: telefone || null, email: emailClinica || null,
      }
      const result = await salvarConfigClinica(payload)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Configurações salvas!')
      document.documentElement.style.setProperty('--cor-primaria', cor)
    })
  }

  return (
    <div className="space-y-6">
      {/* Personalização */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personalização da Clínica</CardTitle>
          <CardDescription>Nome, logotipo e cor principal exibidos no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label>Logotipo</Label>
            <ImageUpload value={logo} onChange={setLogo} shape="square" maxKB={200} label="Logo" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nome-clinica">Nome da Clínica *</Label>
            <Input id="nome-clinica" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Clínica de Psicologia Bem Estar" maxLength={60} />
          </div>

          <div className="space-y-3">
            <Label>Cor principal</Label>
            <div className="flex flex-wrap gap-2">
              {CORES_SUGERIDAS.map(c => (
                <button key={c.value} type="button" onClick={() => setCor(c.value)} title={c.label}
                  className="h-8 w-8 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c.value, borderColor: cor === c.value ? '#000' : 'transparent', transform: cor === c.value ? 'scale(1.15)' : 'scale(1)' }}
                />
              ))}
              <div className="relative h-8 w-8">
                <input type="color" value={cor} onChange={e => setCor(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" title="Cor personalizada" />
                <div className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: cor, borderColor: CORES_SUGERIDAS.some(c => c.value === cor) ? 'transparent' : '#000' }}>+</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cor atual: <span className="font-mono">{cor}</span></p>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preview</p>
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="logo" className="h-9 w-9 rounded-lg object-cover" /> : (
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: cor }}>{nome.charAt(0).toUpperCase()}</div>
              )}
              <div>
                <p className="font-semibold text-sm">{nome || 'Nome da Clínica'}</p>
                <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da clínica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da Clínica</CardTitle>
          <CardDescription>Informações que aparecem nos recibos e documentos emitidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" value={cnpj}
                onChange={e => setCnpj(mascaraCNPJ(e.target.value))} maxLength={18} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tel-clinica">Telefone</Label>
              <Input id="tel-clinica" placeholder="(11) 99999-9999" value={telefone}
                onChange={e => setTelefone(mascaraTelefone(e.target.value))} maxLength={15} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-clinica">E-mail</Label>
            <Input id="email-clinica" type="email" placeholder="contato@clinica.com.br" value={emailClinica}
              onChange={e => setEmailClinica(e.target.value)} />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" placeholder="Rua, Avenida..." value={endereco}
                onChange={e => setEndereco(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" placeholder="123" value={numero}
                onChange={e => setNumero(e.target.value)} maxLength={10} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" placeholder="Sala 5, Andar 2..." value={complemento}
                onChange={e => setComplemento(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" placeholder="Centro" value={bairro}
                onChange={e => setBairro(e.target.value)} maxLength={60} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1 space-y-1.5">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" placeholder="00000-000" value={cep}
                onChange={e => setCep(mascaraCEP(e.target.value))} maxLength={9} />
            </div>
            <div className="sm:col-span-1 space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" placeholder="São Paulo" value={cidade}
                onChange={e => setCidade(e.target.value)} maxLength={60} />
            </div>
            <div className="sm:col-span-1 space-y-1.5">
              <Label htmlFor="estado">Estado</Label>
              <Input id="estado" placeholder="SP" value={estado}
                onChange={e => setEstado(e.target.value.toUpperCase())} maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Salvar Configurações
      </Button>
    </div>
  )
}
