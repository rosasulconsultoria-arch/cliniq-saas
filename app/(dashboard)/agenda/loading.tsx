import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-40 ml-2" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-8 border-b">
          <Skeleton className="h-12 m-1" />
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 m-1" />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 border-b h-14">
            <Skeleton className="h-4 w-10 m-auto" />
            {Array.from({ length: 7 }).map((_, j) => <div key={j} className="border-l" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
