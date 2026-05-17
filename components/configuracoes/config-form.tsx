'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ImageUpload } from '@/components/ui/image-upload'
import { salvarConfigClinica } from '@/app/(dashboard)/configuracoes/actions'

interface Props {
  initialNome: string
  initialCor: string
  initialLogo: string | null
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

export function ConfigForm({ initialNome, initialCor, initialLogo }: Props) {
  const [nome, setNome] = useState(initialNome)
  const [cor, setCor] = useState(initialCor)
  const [logo, setLogo] = useState<string | null>(initialLogo)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!nome.trim()) { toast.error('Nome da clínica obrigatório'); return }
    startTransition(async () => {
      const result = await salvarConfigClinica({ nome, corPrimaria: cor, logoBase64: logo })
      if (result?.error) { toast.error(result.error); return }
      toast.success('Configurações salvas!')
      // Atualiza cor no CSS em tempo real
      document.documentElement.style.setProperty('--cor-primaria', cor)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personalização da Clínica</CardTitle>
        <CardDescription>Nome, logotipo e cor principal exibidos no sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="space-y-1.5">
          <Label>Logotipo</Label>
          <ImageUpload
            value={logo}
            onChange={setLogo}
            shape="square"
            maxKB={200}
            label="Logo"
          />
        </div>

        {/* Nome */}
        <div className="space-y-1.5">
          <Label htmlFor="nome-clinica">Nome da Clínica *</Label>
          <Input
            id="nome-clinica"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Clínica de Psicologia Bem Estar"
            maxLength={60}
          />
        </div>

        {/* Cor primária */}
        <div className="space-y-3">
          <Label>Cor principal</Label>
          <div className="flex flex-wrap gap-2">
            {CORES_SUGERIDAS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCor(c.value)}
                title={c.label}
                className="h-8 w-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c.value,
                  borderColor: cor === c.value ? '#000' : 'transparent',
                  transform: cor === c.value ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
            {/* Custom color */}
            <div className="relative h-8 w-8">
              <input
                type="color"
                value={cor}
                onChange={e => setCor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Cor personalizada"
              />
              <div
                className="h-8 w-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: cor, borderColor: CORES_SUGERIDAS.some(c => c.value === cor) ? 'transparent' : '#000' }}
              >
                +
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Cor atual: <span className="font-mono">{cor}</span></p>
        </div>

        {/* Preview */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Preview</p>
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="logo" className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: cor }}>
                {nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{nome || 'Nome da Clínica'}</p>
              <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-7 rounded px-3 text-xs font-medium text-white flex items-center" style={{ backgroundColor: cor }}>
              Botão primário
            </div>
            <div className="h-7 rounded px-3 text-xs font-medium border flex items-center" style={{ color: cor, borderColor: cor }}>
              Botão outline
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending} className="w-full">
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  )
}
