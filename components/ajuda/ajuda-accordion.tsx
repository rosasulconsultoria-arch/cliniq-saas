'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Item {
  pergunta: string
  resposta: string
}

export function AjudaAccordion({ items, prefix }: { items: Item[]; prefix: string }) {
  const [aberto, setAberto] = useState<number | null>(null)

  return (
    <div className="rounded-lg border bg-card divide-y">
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
            onClick={() => setAberto(aberto === i ? null : i)}
          >
            <span>{item.pergunta}</span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 ml-3 transition-transform', aberto === i && 'rotate-180')} />
          </button>
          {aberto === i && (
            <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t pt-3">
              {item.resposta}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
