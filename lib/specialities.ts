export const ESPECIALIDADES = [
  'PSICOLOGIA',
  'PSIQUIATRIA',
  'FONOAUDIOLOGIA',
  'NUTRICAO',
  'FISIOTERAPIA',
  'TERAPIA_OCUPACIONAL',
  'OUTRO',
] as const

export type Especialidade = typeof ESPECIALIDADES[number]

export const ESPECIALIDADE_LABELS: Record<Especialidade, string> = {
  PSICOLOGIA: 'Psicologia',
  PSIQUIATRIA: 'Psiquiatria',
  FONOAUDIOLOGIA: 'Fonoaudiologia',
  NUTRICAO: 'Nutrição',
  FISIOTERAPIA: 'Fisioterapia',
  TERAPIA_OCUPACIONAL: 'Terapia Ocupacional',
  OUTRO: 'Outro',
}
