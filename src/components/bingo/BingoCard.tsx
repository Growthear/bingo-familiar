'use client'

import { cn } from '@/lib/utils'
import type { BingoGrid } from '@/types/database'

interface BingoCardProps {
  card: BingoGrid
  drawnNumbers: Set<number>
  markedNumbers: Set<number>
  onToggleMark: (num: number) => void
}

export default function BingoCard({ card, drawnNumbers, markedNumbers, onToggleMark }: BingoCardProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid gap-[3px] bg-violet-200 rounded-xl p-[3px] border-2 border-violet-300 min-w-[288px] mx-auto"
        style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
      >
        {card.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            if (num === null) {
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="aspect-square rounded-lg bg-violet-50"
                />
              )
            }

            const drawn = drawnNumbers.has(num)
            const marked = markedNumbers.has(num)

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => onToggleMark(num)}
                className={cn(
                  'aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold transition-all select-none active:scale-95',
                  marked && drawn
                    ? 'bg-green-500 text-white shadow-inner'
                    : marked && !drawn
                    ? 'bg-yellow-400 text-yellow-900'
                    : drawn && !marked
                    ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
                    : 'bg-white text-gray-700 hover:bg-violet-50'
                )}
              >
                {num}
              </button>
            )
          })
        )}
      </div>
      <div className="flex gap-3 justify-center mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Marcado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 ring-1 ring-orange-300 inline-block" /> Salió</span>
      </div>
    </div>
  )
}
