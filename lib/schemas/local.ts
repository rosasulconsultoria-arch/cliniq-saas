import { z } from 'zod'

export const TipoLocalEnum = z.enum(['SALA', 'ONLINE', 'DOMICILIAR', 'EXTERNO'])
export type TipoLocal = z.infer<typeof TipoLocalEnum>

export const LocalSchema = z.object({
  nome:        z.string().min(2, 'Nome do local obrigatório'),
  tipo:        TipoLocalEnum.default('SALA'),
  capacidade:  z.coerce.number().int().min(1).optional(),
  descricao:   z.string().optional(),
  endereco:    z.string().optional(),
  linkPadrao:  z.string().url('URL inválida').optional().or(z.literal('')),
  instrucoes:  z.string().optional(),
  ativa:       z.boolean().default(true),
})

export type LocalFormData = z.infer<typeof LocalSchema>

// Ícones e labels por tipo (usados em UI)
export const TIPO_LOCAL_LABELS: Record<TipoLocal, string> = {
  SALA:        'Sala',
  ONLINE:      'Online',
  DOMICILIAR:  'Domiciliar',
  EXTERNO:     'Externo',
}

export const TIPO_LOCAL_ICONS: Record<TipoLocal, string> = {
  SALA:        '🏢',
  ONLINE:      '🎥',
  DOMICILIAR:  '🏠',
  EXTERNO:     '📍',
}

// Locais tipos ONLINE e DOMICILIAR não competem por espaço físico
export const TIPO_LOCAL_FISICO: TipoLocal[] = ['SALA', 'EXTERNO']
