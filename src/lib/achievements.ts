export type AchievementId =
  | 'first_game' | 'five_games' | 'ten_games' | 'twentyfive_games' | 'multi_card'
  | 'first_win' | 'five_wins' | 'ten_wins' | 'twentyfive_wins'
  | 'first_terno' | 'first_linea' | 'first_bingo'
  | 'fast_bingo' | 'lucky_terno' | 'hat_trick'
  | 'first_host' | 'profile_complete'

export type AchievementCategory = 'participation' | 'wins' | 'prizes' | 'special' | 'social' | 'profile'

export interface AchievementDef {
  id: AchievementId
  name: string
  description: string
  icon: string
  category: AchievementCategory
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_game',       name: 'Primera partida',  description: 'Jugaste tu primera partida de bingo',             icon: '🎱', category: 'participation' },
  { id: 'five_games',       name: 'Jugador habitual', description: 'Jugaste 5 partidas',                               icon: '🎯', category: 'participation' },
  { id: 'ten_games',        name: 'Veterano',          description: 'Jugaste 10 partidas',                             icon: '🏅', category: 'participation' },
  { id: 'twentyfive_games', name: 'Adicto al bingo',  description: '25 partidas jugadas',                             icon: '🎰', category: 'participation' },
  { id: 'multi_card',       name: 'Coleccionista',    description: 'Jugaste una partida con 3 o más cartones',         icon: '📋', category: 'participation' },
  { id: 'first_win',        name: 'Primer triunfo',   description: 'Ganaste tu primer premio',                         icon: '⭐', category: 'wins' },
  { id: 'five_wins',        name: 'Ganador',           description: 'Ganaste 5 premios en total',                      icon: '🌟', category: 'wins' },
  { id: 'ten_wins',         name: 'Campeón',           description: 'Ganaste 10 premios en total',                     icon: '🥇', category: 'wins' },
  { id: 'twentyfive_wins',  name: 'Leyenda',           description: '25 premios ganados',                              icon: '👑', category: 'wins' },
  { id: 'first_terno',      name: '¡Terno!',           description: 'Cantaste tu primer terno',                        icon: '3️⃣', category: 'prizes' },
  { id: 'first_linea',      name: '¡Línea!',           description: 'Completaste tu primera línea',                    icon: '➡️',  category: 'prizes' },
  { id: 'first_bingo',      name: '¡BINGO!',           description: 'Cantaste tu primer bingo',                        icon: '🎉', category: 'prizes' },
  { id: 'fast_bingo',       name: 'Rayo',              description: 'Bingo antes del número 20',                       icon: '⚡', category: 'special' },
  { id: 'lucky_terno',      name: 'Suertudo',          description: 'Terno en los primeros 15 números sorteados',      icon: '🍀', category: 'special' },
  { id: 'hat_trick',        name: 'Hat trick',         description: 'Ganaste terno, línea y bingo en la misma partida',icon: '🎩', category: 'special' },
  { id: 'first_host',       name: 'Anfitrión',         description: 'Creaste tu primera sala de bingo',                icon: '🏠', category: 'social' },
  { id: 'profile_complete', name: 'Perfil completo',   description: 'Foto de perfil y alias de MP configurados',       icon: '💎', category: 'profile' },
]

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a])) as Record<AchievementId, AchievementDef>

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  participation: '🎮 Participación',
  wins:          '🏆 Victorias',
  prizes:        '🎲 Premios',
  special:       '⚡ Especiales',
  social:        '🏠 Social',
  profile:       '👤 Perfil',
}

export const CATEGORY_ORDER: AchievementCategory[] = ['participation', 'wins', 'prizes', 'special', 'social', 'profile']
