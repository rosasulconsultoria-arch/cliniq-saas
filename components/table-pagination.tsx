'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
  total: number
  page: number
  perPage: number
}

export function TablePagination({ total, page, perPage }: TablePaginationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / perPage)

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (totalPages <= 1 && total <= perPage) {
    return (
      <div className="px-4 py-3 border-t">
        <p className="text-sm text-muted-foreground">
          {total} registro{total !== 1 ? 's' : ''}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-sm text-muted-foreground">
        {total} registro{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => goTo(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button variant="outline" size="sm" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
