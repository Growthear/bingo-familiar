import type { BingoGrid } from '@/types/database'

// Column c contains numbers from RANGES[c][0] to RANGES[c][1]
const RANGES: [number, number][] = [
  [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
  [50, 59], [60, 69], [70, 79], [80, 90],
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateBingoCard(): BingoGrid {
  // Retry until we get a valid layout (all 9 columns covered)
  while (true) {
    const rowCols: Set<number>[] = Array.from({ length: 3 }, () =>
      new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5))
    )

    const allCovered = [0, 1, 2, 3, 4, 5, 6, 7, 8].every(c =>
      rowCols.some(rc => rc.has(c))
    )
    if (!allCovered) continue

    const grid: BingoGrid = Array.from({ length: 3 }, () => Array(9).fill(null))
    let valid = true

    for (let c = 0; c < 9; c++) {
      const [min, max] = RANGES[c]
      const rowsUsingCol = [0, 1, 2].filter(r => rowCols[r].has(c))
      const available = Array.from({ length: max - min + 1 }, (_, i) => min + i)

      if (available.length < rowsUsingCol.length) { valid = false; break }

      const chosen = shuffle(available).slice(0, rowsUsingCol.length).sort((a, b) => a - b)
      rowsUsingCol.forEach((r, i) => { grid[r][c] = chosen[i] })
    }

    if (valid) return grid
  }
}

export function generateMultipleCards(count: number): BingoGrid[] {
  if (count === 1) return [generateBingoCard()]

  // Un pool shuffleado por columna, compartido entre todos los cartones
  // Cada número que se usa en un cartón queda excluido de los siguientes
  const pools: number[][] = RANGES.map(([min, max]) =>
    shuffle(Array.from({ length: max - min + 1 }, (_, i) => min + i))
  )
  const ptr: number[] = Array(9).fill(0)

  const cards: BingoGrid[] = []

  for (let k = 0; k < count; k++) {
    let card: BingoGrid | null = null

    for (let attempt = 0; attempt < 2000 && !card; attempt++) {
      const rowCols: Set<number>[] = Array.from({ length: 3 }, () =>
        new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5))
      )

      const allCovered = [0, 1, 2, 3, 4, 5, 6, 7, 8].every(c =>
        rowCols.some(rc => rc.has(c))
      )
      if (!allCovered) continue

      // Verificar que el pool de cada columna tenga suficientes números restantes
      const colUsage = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(c =>
        [0, 1, 2].filter(r => rowCols[r].has(c)).length
      )
      const canFit = colUsage.every((usage, c) => ptr[c] + usage <= pools[c].length)
      if (!canFit) continue

      const grid: BingoGrid = Array.from({ length: 3 }, () => Array(9).fill(null))

      for (let c = 0; c < 9; c++) {
        const rows = [0, 1, 2].filter(r => rowCols[r].has(c))
        if (rows.length === 0) continue
        const chosen = pools[c].slice(ptr[c], ptr[c] + rows.length).sort((a, b) => a - b)
        ptr[c] += rows.length
        rows.forEach((r, i) => { grid[r][c] = chosen[i] })
      }

      card = grid
    }

    // Fallback por si el pool se agotó en alguna columna (caso extremo)
    cards.push(card ?? generateBingoCard())
  }

  return cards
}
