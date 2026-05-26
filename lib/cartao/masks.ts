export function mascaraCartao(v: string): string {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function mascaraValidade(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4)
  if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`
  return d
}

export function mascaraCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function mascaraCEP(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`
  return d
}

export function mascaraTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
