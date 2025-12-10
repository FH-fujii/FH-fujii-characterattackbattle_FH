"use client"

import { cn } from "@/lib/utils"

interface CharacterProps {
  character: {
    name: string
    maxHp: number
    hp: number
    avatar: string
    isAttacking: boolean
    isHit: boolean
  }
  side: "left" | "right"
  isCurrentTurn: boolean
}

export function Character({ character, side, isCurrentTurn }: CharacterProps) {
  const hpPercentage = (character.hp / character.maxHp) * 100

  const getHpColor = () => {
    if (hpPercentage > 50) return "bg-green-500"
    if (hpPercentage > 25) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="flex-1 max-w-[200px]">
      {/* キャラクター名 */}
      <div className={cn("text-lg font-bold mb-2 text-center", isCurrentTurn && "text-accent")}>
        {character.name}
        {isCurrentTurn && <span className="ml-2 animate-pulse">⚡</span>}
      </div>

      {/* HPバー */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">HP</span>
          <span className="font-mono">
            {character.hp}/{character.maxHp}
          </span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden border border-border">
          <div
            className={cn("h-full transition-all duration-300", getHpColor())}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* キャラクターアバター */}
      <div
        className={cn(
          "text-7xl text-center transition-transform duration-200",
          side === "right" && "-scale-x-100",
          character.isAttacking && side === "left" && "animate-attack-right",
          character.isAttacking && side === "right" && "animate-attack-left",
          character.isHit && "animate-hit",
        )}
      >
        {character.avatar}
      </div>
    </div>
  )
}
