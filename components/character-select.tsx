"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { ALL_CHARACTERS, DECK_STRATEGIES, type CharacterTemplate, type DeckStrategy } from "@/lib/characters"
import { Shuffle, Trash2 } from "lucide-react"
import { soundManager } from "@/lib/sounds"

interface CharacterSelectProps {
  selectedCharacters: CharacterTemplate[]
  onSelect: (characters: CharacterTemplate[]) => void
  onStart: (enemyTeam: CharacterTemplate[]) => void
  winStreak?: number
}

function CharacterIcon({
  char,
  size = 80,
  className = "",
}: { char: CharacterTemplate; size?: number; className?: string }) {
  const bgX = char.spritePosition.col * (100 / 4)
  const bgY = char.spritePosition.row * 100

  return (
    <div
      className={`overflow-hidden rounded-lg ${className}`}
      style={{
        width: size,
        height: size * 1.25,
        backgroundImage: "url('/images/characters.jpg')",
        backgroundSize: "500% 200%",
        backgroundPosition: `${bgX}% ${bgY}%`,
      }}
    />
  )
}

export function CharacterSelect({ selectedCharacters, onSelect, onStart, winStreak = 0 }: CharacterSelectProps) {
  const [hoveredChar, setHoveredChar] = useState<CharacterTemplate | null>(null)
  const [currentStrategy, setCurrentStrategy] = useState<DeckStrategy | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [slotVoiceDisplay, setSlotVoiceDisplay] = useState<{ slotIndex: number; voice: string } | null>(null)
  const [hoveredEnemyIndex, setHoveredEnemyIndex] = useState<number | null>(null)
  const [enemyTauntDisplay, setEnemyTauntDisplay] = useState<{ enemyIndex: number; voice: string } | null>(null)

  const enemyTeam = useMemo(() => {
    const shuffled = [...ALL_CHARACTERS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5)
  }, [])

  useEffect(() => {
    randomizeStrategy()
    soundManager.playFormationBgm()
    return () => soundManager.stopBgm()
  }, [])

  const randomizeStrategy = () => {
    const randomIndex = Math.floor(Math.random() * DECK_STRATEGIES.length)
    setCurrentStrategy(DECK_STRATEGIES[randomIndex])
  }

  const showVoiceForSlot = (slotIndex: number) => {
    const randomVoice = [
      "任せよ！",
      "我が力を\n見よ！",
      "勝利は\n我が手に！",
      "共に\n戦おうぞ！",
      "いざ、\n参らん！",
      "後には\n退かぬ！",
    ][Math.floor(Math.random() * 6)]
    setSlotVoiceDisplay({ slotIndex, voice: randomVoice })
    setTimeout(() => setSlotVoiceDisplay(null), 1800)
  }

  const showEnemyTaunt = () => {
    const randomEnemyIndex = Math.floor(Math.random() * 5)
    const randomVoice = [
      "ふん、\nその程度か？",
      "笑止！",
      "我を\n倒せるかな？",
      "怖気づいたか？",
      "来い、\n相手になろう",
      "震えて\n眠れ！",
      "愚かな…",
      "それが\n貴様の全力か？",
    ][Math.floor(Math.random() * 8)]
    setEnemyTauntDisplay({ enemyIndex: randomEnemyIndex, voice: randomVoice })
    setTimeout(() => setEnemyTauntDisplay(null), 2000)
  }

  const toggleCharacter = (char: CharacterTemplate) => {
    const existingIndex = selectedCharacters.findIndex((s) => s.id === char.id)
    if (existingIndex >= 0) {
      soundManager.playDeselectSound()
      const newSelected = [...selectedCharacters]
      newSelected.splice(existingIndex, 1)
      onSelect(newSelected)
    } else if (selectedCharacters.length < 5) {
      soundManager.playSelectSound()
      const newSelected = [...selectedCharacters, char]
      onSelect(newSelected)
      if (Math.random() < 0.45) {
        const newSlotIndex = newSelected.length - 1
        showVoiceForSlot(newSlotIndex)
      }
      if (Math.random() < 0.2) {
        setTimeout(() => showEnemyTaunt(), 500)
      }
    }
  }

  const isSelected = (char: CharacterTemplate) => selectedCharacters.some((s) => s.id === char.id)
  const getSelectionOrder = (char: CharacterTemplate) => selectedCharacters.findIndex((s) => s.id === char.id) + 1

  const isRecommendedForNextSlot = (char: CharacterTemplate) => {
    if (!currentStrategy) return false
    const nextSlotIndex = selectedCharacters.length
    if (nextSlotIndex >= 5) return false
    if (isSelected(char)) return false
    return currentStrategy.members[nextSlotIndex] === char.id
  }

  const displayChar =
    hoveredSlot !== null
      ? selectedCharacters[hoveredSlot]
      : hoveredChar || selectedCharacters[selectedCharacters.length - 1] || null

  const removeFromSlot = (index: number) => {
    soundManager.playDeselectSound()
    const newSelected = [...selectedCharacters]
    newSelected.splice(index, 1)
    onSelect(newSelected)
  }

  const applyRecommendedDeck = () => {
    if (!currentStrategy) return
    soundManager.playSelectSound()
    const recommended = currentStrategy.members
      .map((id) => ALL_CHARACTERS.find((c) => c.id === id))
      .filter((c): c is CharacterTemplate => c !== undefined)
    onSelect(recommended)

    setTimeout(() => {
      const randomSlot = Math.floor(Math.random() * 5)
      showVoiceForSlot(randomSlot)
    }, 200)

    setTimeout(() => showEnemyTaunt(), 800)
  }

  const clearAllSelections = () => {
    soundManager.playDeselectSound()
    onSelect([])
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const newSelected = [...selectedCharacters]
      const [draggedItem] = newSelected.splice(draggedIndex, 1)
      newSelected.splice(targetIndex, 0, draggedItem)
      onSelect(newSelected)
      soundManager.playSelectSound()
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const detailedEnemy = hoveredEnemyIndex !== null ? enemyTeam[hoveredEnemyIndex] : enemyTeam[0]

  return (
    <div
      className="min-h-screen p-3 flex flex-col relative"
      style={{
        backgroundImage: "url('/images/battle-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col flex-1">
        <div className="mb-3 flex flex-col items-center">
          <div className="mb-2 text-center">
            <div className="text-yellow-400 text-2xl font-bold mb-1">3回勝ち抜きせよ！</div>
            <div className="text-white text-lg">
              現在 <span className="text-red-400 text-2xl font-bold">{winStreak}</span>/3 討伐
            </div>
          </div>

          <div className="text-red-500 text-xl font-bold mb-2">敵情報</div>
          <div className="flex items-start gap-4">
            <div className="flex gap-2 justify-center">
              {[...enemyTeam].reverse().map((char, displayIndex) => {
                const actualIndex = 4 - displayIndex
                const displayNumber = 5 - displayIndex
                const isFirst = actualIndex === 0
                const showTaunt = enemyTauntDisplay && enemyTauntDisplay.enemyIndex === actualIndex
                return (
                  <div
                    key={char.id}
                    className="flex flex-col items-center cursor-pointer relative"
                    onMouseEnter={() => setHoveredEnemyIndex(actualIndex)}
                    onMouseLeave={() => setHoveredEnemyIndex(null)}
                  >
                    {showTaunt && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
                        <div
                          className="bg-blue-900 text-blue-100 text-xs px-2 py-1 rounded-lg shadow-lg text-center leading-relaxed border border-blue-400"
                          style={{ whiteSpace: "pre-line", minWidth: "70px" }}
                        >
                          {enemyTauntDisplay.voice}
                        </div>
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-900" />
                      </div>
                    )}
                    {isFirst && <div className="text-blue-400 mt-0 mb-1 text-xs">▼次</div>}
                    {!isFirst && <div className="h-4 mb-1" />}
                    <div
                      className={`border-3 rounded-lg overflow-hidden ${hoveredEnemyIndex === actualIndex ? "border-yellow-400" : "border-blue-500"} ${isFirst ? "animate-bounce-slow" : ""}`}
                      style={
                        isFirst
                          ? { animation: "idle-bounce 1.5s ease-in-out infinite", borderWidth: 3 }
                          : { borderWidth: 3 }
                      }
                    >
                      <CharacterIcon char={char} size={60} />
                    </div>
                    <div className="text-center mt-1">
                      <div className="text-white font-bold text-lg">{char.name}</div>
                      <div className="font-bold text-sm text-[rgba(107,160,240,1)]">{displayNumber}番</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-black/80 border border-blue-500 rounded-lg p-2 w-[200px] h-[160px]">
              <div className="flex gap-2">
                <CharacterIcon
                  char={detailedEnemy}
                  size={50}
                  className="border-2 border-blue-500 rounded-lg flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-white font-bold text-lg">{detailedEnemy.name}</div>
                  <div className="leading-tight text-sm">
                    <span className="text-orange-400">攻{detailedEnemy.attack}</span>
                    <span className="text-blue-400 ml-1">体{detailedEnemy.maxHp}</span>
                    <span className="text-yellow-400 ml-1">速{detailedEnemy.speed}</span>
                  </div>
                </div>
              </div>
              <div className="mt-1 pt-1 border-t border-blue-500/30">
                <div className="text-sm">
                  <div className="text-amber-400 font-bold">【{detailedEnemy.skillName}】</div>
                  <div className="text-gray-300 leading-tight text-sm mt-0.5">{detailedEnemy.skillDescription}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/50 mb-7" />

        <div className="flex gap-3 flex-1">
          <div className="flex-1 flex flex-col">
            {/* 編成スロットと特技を横並び */}
            <div className="flex gap-3 mb-3">
              <div className="relative bg-black/80 border border-amber-900/50 rounded-lg p-3 w-56 flex-shrink-0 h-44">
                <div className="absolute -top-2.5 left-3 rounded text-primary bg-accent px-2 font-semibold text-xs py-0.5">
                  特技
                </div>
                {displayChar ? (
                  <div className="pt-1">
                    <h3 className="font-bold text-foreground mb-1 text-lg">
                      【{displayChar.title}】{displayChar.name}
                    </h3>
                    <div className="flex gap-3 mb-1 text-sm">
                      <span>
                        攻撃力: <span className="text-red-400 font-bold">{displayChar.attack}</span>
                      </span>
                      <span>
                        体力: <span className="text-blue-400 font-bold">{displayChar.maxHp}</span>
                      </span>
                      <span>
                        速さ: <span className="text-yellow-400 font-bold">{displayChar.speed}</span>
                      </span>
                    </div>
                    <div className="text-xs">
                      <div className="text-amber-400 font-bold">【{displayChar.skillName}】</div>
                      <div className="text-muted-foreground tracking-normal text-sm mt-0.5">
                        {displayChar.skillDescription}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-amber-400 text-sm font-black animate-pulse">武将を選択されたし！</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col relative">
                <div className="absolute -top-5 right-0 text-xs text-white whitespace-nowrap">
                  ※ドラッグ&ドロップで入れ替えできます
                </div>
                <div className="flex justify-center items-start flex-row gap-4">
                  {[0, 1, 2, 3, 4].map((slotIndex) => {
                    const char = selectedCharacters[slotIndex]
                    const isDragging = draggedIndex === slotIndex
                    const isDragOver = dragOverIndex === slotIndex
                    const showVoice = slotVoiceDisplay && slotVoiceDisplay.slotIndex === slotIndex && char
                    return (
                      <div
                        key={slotIndex}
                        className="flex flex-col items-center relative"
                        draggable={!!char}
                        onDragStart={(e) => char && handleDragStart(e, slotIndex)}
                        onDragOver={(e) => char && handleDragOver(e, slotIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, slotIndex)}
                        onDragEnd={handleDragEnd}
                      >
                        {showVoice && (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
                            <div
                              className="bg-gray-900 text-white text-xs px-2 py-1 rounded-lg shadow-lg text-center leading-relaxed border border-gray-600"
                              style={{ whiteSpace: "pre-line", minWidth: "60px" }}
                            >
                              {slotVoiceDisplay.voice}
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                          </div>
                        )}
                        <div
                          className={`w-[80px] h-[100px] rounded-lg flex justify-center transition-all border-[3px] items-center overflow-hidden
                            ${char ? `border-red-500 bg-red-900/50 hover:bg-red-800/50 shadow-lg shadow-red-500/30 cursor-grab active:cursor-grabbing` : "border-dashed border-red-700 bg-red-900/30"}
                            ${isDragging ? "opacity-50 scale-95" : ""}
                            ${isDragOver ? "border-yellow-400 scale-105 bg-yellow-900/30" : ""}
                          `}
                          style={char && !isDragging ? { animation: "idle-bounce 2s ease-in-out infinite" } : {}}
                          onClick={() => char && removeFromSlot(slotIndex)}
                          onMouseEnter={() => char && setHoveredSlot(slotIndex)}
                          onMouseLeave={() => setHoveredSlot(null)}
                        >
                          {char ? (
                            <CharacterIcon char={char} size={78} />
                          ) : (
                            <span className="text-2xl text-red-700/50 border-0">?</span>
                          )}
                        </div>
                        {char && (
                          <div className="text-center mt-0.5">
                            <div className="font-bold text-foreground text-lg">{char.name}</div>
                            <div className="leading-tight text-sm">
                              <span className="text-orange-400">攻{char.attack}</span>
                              <span className="text-blue-400 ml-1">体{char.maxHp}</span>
                            </div>
                          </div>
                        )}
                        <div className="font-bold text-red-400 tracking-normal text-base">{slotIndex + 1}番</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="w-full h-[1px] bg-white/50 mb-3" />

            <div className="grid grid-cols-5 gap-2">
              {ALL_CHARACTERS.map((char) => {
                const selected = isSelected(char)
                const order = getSelectionOrder(char)
                const isRecommended = isRecommendedForNextSlot(char)
                return (
                  <div
                    key={char.id}
                    onClick={() => toggleCharacter(char)}
                    onMouseEnter={() => setHoveredChar(char)}
                    onMouseLeave={() => setHoveredChar(null)}
                    className={`relative cursor-pointer transition-all ${selectedCharacters.length >= 5 && !selected ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {selected && (
                      <div className="absolute top-1 left-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                        {order}
                      </div>
                    )}
                    {isRecommended && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-black px-2 py-0.5 rounded shadow-lg shadow-amber-500/50 animate-pulse z-10">
                        推奨
                      </div>
                    )}
                    <div
                      className={`rounded-lg border-4 flex flex-col items-center justify-end transition-all overflow-hidden relative ${selected ? "border-red-500 shadow-lg shadow-red-500/50" : "border-red-700 hover:border-red-500"}`}
                    >
                      <CharacterIcon char={char} size={105} className="w-full" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent py-1 px-1">
                        <div className="text-white font-bold text-base text-center drop-shadow-lg">{char.name}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 右側: 推奨陣形と戦闘開始ボタン */}
          <div className="flex flex-col items-center w-44 gap-3">
            {currentStrategy && (
              <div className="bg-black/70 border border-primary/30 rounded-lg p-2 w-full">
                <div className="mb-2">
                  <div className="text-amber-400 font-bold text-xs">本日の推奨陣形</div>
                  <div className="text-foreground font-bold text-sm">{currentStrategy.name}</div>
                  <div className="w-full h-[1px] bg-amber-400/50 my-1" />
                  <div className="text-muted-foreground text-sm">{currentStrategy.description}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <button
                      onClick={applyRecommendedDeck}
                      className="flex-1 px-2 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg font-bold text-xs transition-colors"
                    >
                      一括編成
                    </button>
                    <button
                      onClick={clearAllSelections}
                      disabled={selectedCharacters.length === 0}
                      className={`flex-1 px-2 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1
                        ${selectedCharacters.length > 0 ? "bg-red-600 hover:bg-red-500 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      解除
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      randomizeStrategy()
                      onSelect([])
                    }}
                    className="w-full p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors flex items-center justify-center gap-1 text-xs"
                  >
                    <Shuffle className="w-3 h-3" />
                    別の陣形
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => onStart(enemyTeam)}
              disabled={selectedCharacters.length !== 5}
              className={`rounded-full font-black transition-all flex flex-col items-center justify-center leading-none text-3xl w-44 h-44 ${selectedCharacters.length === 5 ? "bg-red-600 text-white hover:bg-red-500 shadow-2xl shadow-red-500/50 border-4 border-red-400" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
            >
              <span>戦闘</span>
              <span>開始</span>
            </button>
            <div className="text-center text-sm font-bold text-foreground">
              部隊 <span className="text-red-400">{selectedCharacters.length}</span>/5
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes idle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
