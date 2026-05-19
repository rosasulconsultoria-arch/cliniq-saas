'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { encontrarCidade } from '@/data/cidades-br'
import 'leaflet/dist/leaflet.css'

interface PacienteLocal { cidade: string | null }

interface Props { pacientes: PacienteLocal[] }

export function CrmMapa({ pacientes }: Props) {
  // Count patients per city
  const cidadeContagem = useMemo(() => {
    const counts: Record<string, number> = {}
    pacientes.forEach(p => {
      if (!p.cidade) return
      counts[p.cidade] = (counts[p.cidade] ?? 0) + 1
    })
    return counts
  }, [pacientes])

  const pontos = useMemo(() => {
    return Object.entries(cidadeContagem).flatMap(([cidade, count]) => {
      const coords = encontrarCidade(cidade)
      if (!coords) return []
      return [{ cidade, count, lat: coords.lat, lng: coords.lng, uf: coords.uf }]
    }).sort((a, b) => b.count - a.count)
  }, [cidadeContagem])

  const maxCount = Math.max(...pontos.map(p => p.count), 1)

  function getColor(count: number): string {
    const ratio = count / maxCount
    if (ratio > 0.7) return '#dc2626'
    if (ratio > 0.4) return '#f97316'
    if (ratio > 0.2) return '#eab308'
    return '#22c55e'
  }

  function getRadius(count: number): number {
    return Math.max(8, Math.min(40, 8 + (count / maxCount) * 32))
  }

  const semCidade = pacientes.filter(p => !p.cidade).length
  const naoMapeados = Object.entries(cidadeContagem)
    .filter(([cidade]) => !encontrarCidade(cidade))
    .reduce((s, [, c]) => s + c, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{pontos.length} cidade(s) mapeada(s)</span>
        {naoMapeados > 0 && <span className="text-amber-600">{naoMapeados} paciente(s) em cidades não mapeadas</span>}
        {semCidade > 0 && <span>{semCidade} paciente(s) sem cidade cadastrada</span>}
        <div className="flex items-center gap-3 ml-auto text-xs">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Poucos</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-yellow-400" /> Médio</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-orange-500" /> Alto</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-600" /> Concentração</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ height: 480 }}>
        <MapContainer
          center={[-14.235, -51.925]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pontos.map(p => (
            <CircleMarker
              key={p.cidade}
              center={[p.lat, p.lng]}
              radius={getRadius(p.count)}
              pathOptions={{
                fillColor: getColor(p.count),
                fillOpacity: 0.7,
                color: getColor(p.count),
                weight: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="text-xs font-medium">
                  <p className="font-semibold">{p.cidade} — {p.uf}</p>
                  <p>{p.count} paciente{p.count !== 1 ? 's' : ''}</p>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Top cidades */}
      {pontos.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pontos.slice(0, 6).map((p, i) => (
            <div key={p.cidade} className="flex items-center gap-3 rounded-lg border p-3 bg-card">
              <span className="text-lg font-bold text-muted-foreground w-6 shrink-0">#{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.cidade}</p>
                <p className="text-xs text-muted-foreground">{p.uf}</p>
              </div>
              <span className="ml-auto font-bold text-sm shrink-0" style={{ color: getColor(p.count) }}>
                {p.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
