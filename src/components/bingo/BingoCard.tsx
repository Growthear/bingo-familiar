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
    <div className="w-full">
      <div
        className="grid gap-[3px] bg-sky-300 rounded-2xl p-[3px] border-2 border-sky-400 w-full"
        style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
      >
        {card.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            if (num === null) {
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="aspect-square rounded-xl bg-sky-50"
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
                  'aspect-square rounded-xl flex items-center justify-center font-bold transition-all select-none active:scale-90',
                  'text-[11px] sm:text-xs',
                  marked && drawn
                    ? 'bg-green-500 text-white shadow-inner'
                    : marked && !drawn
                    ? 'bg-amber-300 text-amber-900'
                    : drawn && !marked
                    ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-400'
                    : 'bg-white text-gray-700 hover:bg-sky-50 active:bg-sky-100'
                )}
              >
                {num}
              </button>
            )
          })
        )}
      </div>
      <div className="flex gap-4 justify-center mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Marcado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sky-100 ring-1 ring-sky-400 inline-block" /> Salió
        </span>
      </div>
    </div>
  )
}
