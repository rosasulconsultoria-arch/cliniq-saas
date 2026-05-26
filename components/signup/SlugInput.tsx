'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { validarSlug } from '@/app/(public)/signup/actions'
import { isReservedSlug } from '@/lib/signup/slug'

type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'reserved'

interface SlugInputProps {
  value: string
  onChange: (value: string) => void
  onStatusChange?: (available: boolean) => void
}

export function SlugInput({ value, onChange, onStatusChange }: SlugInputProps) {
  const [status, setStatus] = useState<SlugStatus>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!value || value.length < 3) {
      setStatus('idle')
      setSuggestions([])
      onStatusChange?.(false)
      return
    }

    if (isReservedSlug(value)) {
      setStatus('reserved')
      setSuggestions([])
      onStatusChange?.(false)
      return
    }

    setStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const result = await validarSlug(value)
      if (result.available) {
        setStatus('available')
        setSuggestions([])
        onStatusChange?.(true)
      } else {
        setStatus('unavailable')
        setSuggestions(result.suggestions ?? [])
        onStatusChange?.(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, onStatusChange])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center overflow-hidden rounded-md border focus-within:ring-2 focus-within:ring-ring">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="minha-clinica"
          className="flex-1 border-none shadow-none focus-visible:ring-0"
        />
        <span className="flex items-center gap-1.5 border-l bg-muted px-3 py-2 text-sm text-muted-foreground">
          {status === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {status === 'available' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
          {(status === 'unavailable' || status === 'reserved') && (
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          .cliniq.com.br
        </span>
      </div>

      {status === 'available' && (
        <p className="text-xs text-green-600 dark:text-green-400">✓ Disponível</p>
      )}
      {status === 'unavailable' && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-destructive">✗ Indisponível</p>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s)}
                  className="rounded-full border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {status === 'reserved' && (
        <p className="text-xs text-destructive">✗ Este nome é reservado, escolha outro</p>
      )}
    </div>
  )
}
