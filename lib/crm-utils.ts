export function personalizarMensagem(template: string, vars: {
  nome?: string
  cidade?: string
  bairro?: string
  servico?: string
  ultimaConsulta?: string
}) {
  return template
    .replace(/\{\{nome\}\}/gi, vars.nome ?? '')
    .replace(/\{\{cidade\}\}/gi, vars.cidade ?? '')
    .replace(/\{\{bairro\}\}/gi, vars.bairro ?? '')
    .replace(/\{\{servico\}\}/gi, vars.servico ?? '')
    .replace(/\{\{ultima_consulta\}\}/gi, vars.ultimaConsulta ?? '')
}
