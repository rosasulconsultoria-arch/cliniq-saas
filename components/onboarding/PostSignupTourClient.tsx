'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dispensarTour } from '@/app/(dashboard)/dashboard/actions'
import type { TourItem } from './PostSignupTour'

interface PostSignupTourClientProps {
  items: TourItem[]
  essenciaisCompletos: number
}

export function PostSignupTourClient({ items, essenciaisCompletos }: PostSignupTourClientProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const totalEssenciais = items.filter((i) => i.essencial).length
  const tourConcluivel = essenciaisCompletos === totalEssenciais

  const handleDispensar = () => {
    startTransition(async () => {
      await dispensarTour()
    })
  }

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl rounded-xl border bg-card shadow-sm">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Primeiros passos</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {essenciaisCompletos}/{totalEssenciais}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDispensar()
            }}
            className="rounded p-0.5 hover:bg-muted"
            aria-label="Dispensar tour"
            disabled={isPending}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="border-t px-4 py-3">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  {item.done ? (
                    <span className="text-sm text-muted-foreground line-through">{item.label}</span>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-sm text-foreground hover:underline"
                    >
                      {item.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t px-4 py-3 flex justify-end">
            <Button
              variant={tourConcluivel ? 'default' : 'ghost'}
              size="sm"
              onClick={handleDispensar}
              disabled={isPending}
            >
              {tourConcluivel ? 'Concluir tour' : 'Dispensar tour'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
