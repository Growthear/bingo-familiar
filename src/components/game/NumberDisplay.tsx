'use client'

interface NumberDisplayProps {
  currentNumber: number | null
  totalDrawn: number
}

export default function NumberDisplay({ currentNumber, totalDrawn }: NumberDisplayProps) {
  return (
    <div className="flex flex-col items-center py-2">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Número actual</p>
      <div className="relative">
        {/* Outer ring - celeste */}
        <div className="w-32 h-32 rounded-full bg-sky-500 flex items-center justify-center shadow-xl shadow-sky-200">
          {/* Inner ball - gold (Sol de Mayo) */}
          <div className="w-[114px] h-[114px] rounded-full bg-amber-400 flex items-center justify-center border-4 border-white shadow-inner">
            <span className="text-5xl font-black text-gray-900 leading-none">
              {currentNumber ?? '?'}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2 font-medium">{totalDrawn} de 90</p>
    </div>
  )
}
