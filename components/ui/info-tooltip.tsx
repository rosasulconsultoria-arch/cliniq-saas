'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { cn } from '@/lib/utils'

interface Props {
  text: string
  className?: string
}

export function InfoTooltip({ text, className }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            className={cn(
              'text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none',
              className,
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[220px] text-xs leading-relaxed text-center"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
