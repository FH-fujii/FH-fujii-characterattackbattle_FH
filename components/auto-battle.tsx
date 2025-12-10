"use client"

import { useState, useCallback } from "react"
import type { CharacterTemplate } from "@/lib/characters"
import { CharacterSelect } from "./character-select"
import { BattleField } from "./battle-field"
import { EndingScreen } from "./ending-screen"

type GamePhase = "select" | "battle" | "ending"

export interface BattleStats {
  odanaMVP: { name: string; kills: number } | null
  totalDamageDealt: number
  mostActiveSKill: string | null
}

export function AutoBattle() {
  const [phase, setPhase] = useState<GamePhase>("select")
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterTemplate[]>([])
  const [enemyTeam, setEnemyTeam] = useState<CharacterTemplate[]>([])
  const [winStreak, setWinStreak] = useState(0)
  const [battleStats, setBattleStats] = useState<BattleStats>({
    odanaMVP: null,
    totalDamageDealt: 0,
    mostActiveSKill: null,
  })

  const handleStartBattle = (enemies: CharacterTemplate[]) => {
    if (selectedCharacters.length === 5) {
      setEnemyTeam(enemies)
      setPhase("battle")
    }
  }

  const handleBackToSelect = () => {
    setPhase("select")
  }

  const handleVictory = useCallback(
    (mvpData?: { name: string; kills: number }) => {
      const newStreak = winStreak + 1
      setWinStreak(newStreak)

      if (mvpData) {
        setBattleStats((prev) => ({
          ...prev,
          odanaMVP: mvpData,
        }))
      }

      if (newStreak >= 3) {
        // 3連勝でエンディングへ
        setPhase("ending")
      }
    },
    [winStreak],
  )

  const handleDefeat = useCallback(() => {
    setWinStreak(0)
    setBattleStats({
      odanaMVP: null,
      totalDamageDealt: 0,
      mostActiveSKill: null,
    })
  }, [])

  const handleNextBattle = useCallback(() => {
    setPhase("select")
  }, [])

  const handleRestart = useCallback(() => {
    setWinStreak(0)
    setBattleStats({
      odanaMVP: null,
      totalDamageDealt: 0,
      mostActiveSKill: null,
    })
    setSelectedCharacters([])
    setPhase("select")
  }, [])

  return (
    <div className="w-full">
      {phase === "select" && (
        <CharacterSelect
          selectedCharacters={selectedCharacters}
          onSelect={setSelectedCharacters}
          onStart={handleStartBattle}
          winStreak={winStreak}
        />
      )}
      {phase === "battle" && (
        <BattleField
          playerTeam={selectedCharacters}
          enemyTeamPreset={enemyTeam}
          onBack={handleBackToSelect}
          winStreak={winStreak}
          onVictory={handleVictory}
          onDefeat={handleDefeat}
          onNextBattle={handleNextBattle}
        />
      )}
      {phase === "ending" && <EndingScreen mvp={battleStats.odanaMVP} onRestart={handleRestart} />}
    </div>
  )
}
