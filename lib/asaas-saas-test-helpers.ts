// Helpers de limpeza para testes E2E que criam dados reais no Asaas Sandbox.
// Use emails com prefixo "test-" e externalReference com prefixo "test-" para que
// esses helpers possam limpar sem afetar dados de outros ambientes.

const BASE_URL = process.env.ASAAS_API_URL ?? 'https://sandbox.asaas.com/api/v3'

function headers() {
  return {
    'Content-Type': 'application/json',
    'access_token': process.env.ASAAS_API_KEY ?? '',
  }
}

async function deletarCustomer(customerId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'DELETE',
      headers: headers(),
    })
  } catch {
    // ignorar falhas individuais de cleanup
  }
}

async function deletarSubscription(subscriptionId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: headers(),
    })
  } catch {
    // ignorar falhas individuais de cleanup
  }
}

export async function cleanupTestCustomers(emailPrefix: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/customers?email=${encodeURIComponent(emailPrefix)}`, {
    headers: headers(),
  })

  if (!res.ok) return 0

  const json = await res.json()
  const customers: Array<{ id: string; email: string }> = json.data ?? []

  const toDelete = customers.filter((c) => c.email.startsWith(emailPrefix))
  await Promise.all(toDelete.map((c) => deletarCustomer(c.id)))

  return toDelete.length
}

export async function cleanupTestSubscriptions(externalReferencePrefix: string): Promise<number> {
  const res = await fetch(
    `${BASE_URL}/subscriptions?externalReference=${encodeURIComponent(externalReferencePrefix)}`,
    { headers: headers() }
  )

  if (!res.ok) return 0

  const json = await res.json()
  const subscriptions: Array<{ id: string; externalReference?: string }> = json.data ?? []

  const toDelete = subscriptions.filter((s) =>
    s.externalReference?.startsWith(externalReferencePrefix)
  )
  await Promise.all(toDelete.map((s) => deletarSubscription(s.id)))

  return toDelete.length
}

export async function cleanupTestCustomerById(customerId: string): Promise<void> {
  await deletarCustomer(customerId)
}

export async function cleanupTestSubscriptionById(subscriptionId: string): Promise<void> {
  await deletarSubscription(subscriptionId)
}
