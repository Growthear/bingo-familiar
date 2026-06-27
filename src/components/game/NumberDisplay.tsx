'use client'

interface NumberDisplayProps {
  currentNumber: number | null
  totalDrawn: number
}

export default function NumberDisplay({ currentNumber, totalDrawn }: NumberDisplayProps) {
  return (
    <div className="flex flex-col items-center py-4">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Número actual</p>
      <div className="w-28 h-28 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-300">
        <span className="text-5xl font-black text-white">
          {currentNumber ?? '?'}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{totalDrawn} de 90</p>
    </div>
  )
}
