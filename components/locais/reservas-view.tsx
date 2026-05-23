'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, EyeOff, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { DIAS_SEMANA_LABELS, formatVigencia } from '@/lib/schemas/reserva-local'
import { toggleAtivaReservaLocal } from '@/app/(dashboard)/locais/[id]/reservas/actions'
import { ReservaSheet, type ReservaExistente } from './reserva-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProfissionalItem { id: string; nome: string }

interface ReservaCompleta extends ReservaExistente {
  profissionalNome: string
}

interface Props {
  localId: string
  localNome: string
  profissionais: ProfissionalItem[]
  reservas: ReservaCompleta[]
}

export function ReservasView({ localId, localNome: _localNome, profissionais, reservas }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editando, setEditando] = useState<ReservaExistente | undefined>(undefined)
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [toggling, startToggle] = useTransition()

  const visíveis = mostrarInativos ? reservas : reservas.filter((r) => r.ativa)

  const porDia = DIAS_SEMANA_LABELS.reduce<Record<number, ReservaCompleta[]>>((acc, _, i) => {
    acc[i] = visíveis.filter((r) => r.diaSemana === i)
    return acc
  }, {})

  const diasComReservas = Object.entries(porDia).filter(([, rs]) => rs.length > 0)

  function abrirNova() {
    setEditando(undefined)
    setSheetOpen(true)
  }

  function abrirEdit(reserva: ReservaCompleta) {
    setEditando(reserva)
    setSheetOpen(true)
  }

  function handleToggleAtiva(reserva: ReservaCompleta) {
    startToggle(async () => {
      await toggleAtivaReservaLocal(reserva.id, localId, !reserva.ativa)
      toast.success(reserva.ativa ? 'Reserva desativada.' : 'Reserva reativada.')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMostrarInativos((v) => !v)}
          className="text-muted-foreground"
        >
          {mostrarInativos ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {mostrarInativos ? 'Ocultar inativas' : 'Mostrar inativas'}
        </Button>
        <Button onClick={abrirNova} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      {diasComReservas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {mostrarInativos
              ? 'Nenhuma reserva cadastrada para este local.'
              : 'Nenhuma reserva ativa. Clique em "Mostrar inativas" para ver todas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {diasComReservas.map(([dia, rs]) => (
            <div key={dia} className="rounded-lg border bg-card">
              <div className="px-4 py-2.5 border-b bg-muted/40 rounded-t-lg">
                <p className="text-sm font-semibold">{DIAS_SEMANA_LABELS[Number(dia)]}</p>
              </div>
              <div className="divide-y">
                {rs.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-4 py-3 ${!r.ativa ? 'opacity-50' : ''}`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.profissionalNome}</span>
                        {!r.ativa && (
                          <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">
                            Inativa
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.horaInicio} – {r.horaFim} &middot; {formatVigencia(r.vigenciaInicio, r.vigenciaFim)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleAtiva(r)}
                        disabled={toggling}
                        title={r.ativa ? 'Desativar' : 'Reativar'}
                      >
                        {r.ativa
                          ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                          : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => abrirEdit(r)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReservaSheet
        localId={localId}
        profissionais={profissionais}
        reserva={editando}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
