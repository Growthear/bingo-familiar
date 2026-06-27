'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface NumberHistoryModalProps {
  drawnNumbers: number[]
  open: boolean
  onClose: () => void
}

export default function NumberHistoryModal({ drawnNumbers, open, onClose }: NumberHistoryModalProps) {
  const drawnSet = new Set(drawnNumbers)
  const lastDrawn = drawnNumbers[drawnNumbers.length - 1]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Números salidos ({drawnNumbers.length}/90)</DialogTitle>
        </DialogHeader>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 90 }, (_, i) => i + 1).map(n => (
            <div
              key={n}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors',
                n === lastDrawn
                  ? 'bg-violet-600 text-white ring-2 ring-violet-300'
                  : drawnSet.has(n)
                  ? 'bg-violet-200 text-violet-800'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {n}
            </div>
          ))}
        </div>
        {drawnNumbers.length > 0 && (
          <div className="mt-2 text-center text-sm text-muted-foreground">
            Últimos: {drawnNumbers.slice(-5).reverse().join(' · ')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
