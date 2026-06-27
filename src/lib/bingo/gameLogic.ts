import type { BingoGrid, PrizeType } from '@/types/database'

export function checkTerno(card: BingoGrid, drawn: Set<number>): boolean {
  for (const row of card) {
    const nums = row.filter((n): n is number => n !== null)
    if (nums.filter(n => drawn.has(n)).length >= 3) return true
  }
  return false
}

export function checkLinea(card: BingoGrid, drawn: Set<number>): boolean {
  for (const row of card) {
    const nums = row.filter((n): n is number => n !== null)
    if (nums.length === 5 && nums.every(n => drawn.has(n))) return true
  }
  return false
}

export function checkBingo(card: BingoGrid, drawn: Set<number>): boolean {
  return card.flat().filter((n): n is number => n !== null).every(n => drawn.has(n))
}

export function checkPrize(card: BingoGrid, drawn: Set<number>, prize: PrizeType): boolean {
  if (prize === 'terno') return checkTerno(card, drawn)
  if (prize === 'linea') return checkLinea(card, drawn)
  return checkBingo(card, drawn)
}

export const PRIZE_LABELS: Record<PrizeType, string> = {
  terno: '¡TERNO!',
  linea: '¡LÍNEA!',
  bingo: '¡BINGO!',
}

export const PRIZE_ORDER: PrizeType[] = ['terno', 'linea', 'bingo']
