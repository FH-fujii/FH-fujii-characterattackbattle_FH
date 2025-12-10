"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { type BattleCharacter, type CharacterTemplate, createBattleCharacter, ALL_CHARACTERS } from "@/lib/characters"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { soundManager } from "@/lib/sounds"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function CharacterCard({
  char,
  isActive = false,
  className = "",
  side = "player",
}: {
  char: CharacterTemplate
  isActive?: boolean
  className?: string
  side?: "player" | "enemy"
}) {
  const bgX = char.spritePosition.col * (100 / 4)
  const bgY = char.spritePosition.row * 100
  const borderColor = side === "player" ? "border-red-500" : "border-blue-500"
  const shadowColor =
    side === "player" ? "shadow-[0_0_15px_rgba(239,68,68,0.6)]" : "shadow-[0_0_15px_rgba(59,130,246,0.6)]"

  return (
    <div
      className={`relative overflow-hidden ${borderColor} ${isActive ? shadowColor : ""} ${className}`}
      style={{
        width: isActive ? 160 : 80,
        height: isActive ? 200 : 100,
        borderWidth: isActive ? 4 : 3,
        borderRadius: 8,
        backgroundImage: "url('/images/characters.jpg')",
        backgroundSize: "500% 200%",
        backgroundPosition: `${bgX}% ${bgY}%`,
      }}
    />
  )
}

interface BattleFieldProps {
  playerTeam: CharacterTemplate[]
  enemyTeamPreset?: CharacterTemplate[]
  onBack: () => void
  winStreak?: number
  onVictory?: (mvpData?: { name: string; kills: number }) => void
  onDefeat?: () => void
  onNextBattle?: () => void
}

interface LogEntry {
  id: number
  message: string
  type: "normal" | "skill" | "defeat" | "victory" | "buff" | "debuff"
  side?: "player" | "enemy"
}

type BattlePhase = "idle" | "pre-attack" | "charge" | "clash" | "damage" | "post-attack" | "fadeout" | "battle-start"

interface StatusEffect {
  type: "buff" | "debuff"
  stat: "attack" | "hp"
  value: number
}

interface DisplayState {
  attackerSpeech: string | null
  defenderSpeech: string | null
  damage: number | null
  damageIsHeal: boolean
  damageSide: "player" | "enemy" | null
  skillType: string | null
  skillSide: "player" | "enemy" | null
  skillName: string | null
}

interface BuffAnimationState {
  isActive: boolean
  targetCharIds: string[]
  targetUniqueId?: string
  message: string | null
  iconType?: "attack" | "defense" | null
}

interface DamageReceivedState {
  isActive: boolean
  targetSide: "player" | "enemy" | null
}

interface TooltipPosition {
  x: number
  y: number
}

interface DefeatVoiceState {
  uniqueInstanceId: string
  charId: string
  voice: string
}

const HECKLE_VOICES = {
  buff: ["みなぎるぞ！", "力が\nあふれる！", "いける！"],
  losing: ["負けそう\nじゃぁ〜", "やばいぞ...", "持ちこたえよ！"],
  winning: ["いいぞ！", "押せ押せ！", "勝てるぞ！"],
}

export function BattleField({
  playerTeam,
  enemyTeamPreset,
  onBack,
  winStreak = 0,
  onVictory,
  onDefeat,
  onNextBattle,
}: BattleFieldProps) {
  const createEnemyTeam = useCallback((): BattleCharacter[] => {
    if (enemyTeamPreset && enemyTeamPreset.length === 5) {
      return enemyTeamPreset.map(createBattleCharacter)
    }
    const shuffled = [...ALL_CHARACTERS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 5)
    selected.sort((a, b) => b.attack + b.maxHp * 0.5 - (a.attack + a.maxHp * 0.5))
    return selected.map(createBattleCharacter)
  }, [enemyTeamPreset])

  const [player, setPlayer] = useState<BattleCharacter[]>(() => playerTeam.map(createBattleCharacter))
  const [enemy, setEnemy] = useState<BattleCharacter[]>(createEnemyTeam)
  const [turn, setTurn] = useState<"player" | "enemy">("player")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logId, setLogId] = useState(0)
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null)
  const [result, setResult] = useState<"player" | "enemy" | null>(null)

  const [battlePhase, setBattlePhase] = useState<BattlePhase>("battle-start")
  const [attackingSide, setAttackingSide] = useState<"player" | "enemy" | null>(null)
  const [displayState, setDisplayState] = useState<DisplayState>({
    attackerSpeech: null,
    defenderSpeech: null,
    damage: null,
    damageIsHeal: false,
    damageSide: null,
    skillType: null,
    skillSide: null,
    skillName: null,
  })

  const [statusEffects, setStatusEffects] = useState<Map<string, StatusEffect[]>>(new Map())

  const [buffAnimation, setBuffAnimation] = useState<BuffAnimationState>({
    isActive: false,
    targetCharIds: [],
    targetUniqueId: undefined,
    message: null,
    iconType: null,
  })

  const [damageReceivedAnim, setDamageReceivedAnim] = useState<DamageReceivedState>({
    isActive: false,
    targetSide: null,
  })

  const [specialSkillEffect, setSpecialSkillEffect] = useState<{
    type: "ninja" | "double-attack" | null
    side: "player" | "enemy" | null
  }>({ type: null, side: null })

  const hasAppliedStartSkillsRef = useRef(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false)
  const [deployedCharIds, setDeployedCharIds] = useState<Set<string>>(new Set())

  const [hoveredChar, setHoveredChar] = useState<BattleCharacter | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ x: 0, y: 0 })

  const [activatedSkills, setActivatedSkills] = useState<Set<string>>(new Set())

  const [defeatVoice, setDefeatVoice] = useState<DefeatVoiceState | null>(null)

  const [showBattleStart, setShowBattleStart] = useState(true)
  const [battleStartPhase, setBattleStartPhase] = useState(0)

  const [heckleDisplay, setHeckleDisplay] = useState<{ uniqueId: string; charId: string; voice: string } | null>(null)

  const logContainerRef = useRef<HTMLDivElement>(null)

  const playerRef = useRef(player)
  const enemyRef = useRef(enemy)
  const turnRef = useRef(turn)
  const bgmStateRef = useRef<"battle-start" | "battle" | "final" | null>(null)

  const battleStartIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const battleStartCompletedRef = useRef(false)

  const battleKeyRef = useRef(Date.now())

  const lastLogMessageRef = useRef("")

  const isPausedRef = useRef(isPaused)
  const pauseResumeRef = useRef<{ wasInMiddleOfPhase: boolean; phase: BattlePhase }>({
    wasInMiddleOfPhase: false,
    phase: "idle",
  })

  const [killCounts, setKillCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    playerRef.current = player
  }, [player])

  useEffect(() => {
    enemyRef.current = enemy
  }, [enemy])

  useEffect(() => {
    turnRef.current = turn
  }, [turn])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    if (showBattleStart || winner) return

    const checkBgm = () => {
      const alivePlayer = playerRef.current.filter((c) => !c.isDefeated).length
      const aliveEnemy = enemyRef.current.filter((c) => !c.isDefeated).length

      if (alivePlayer === 1 && aliveEnemy === 1) {
        if (bgmStateRef.current !== "final") {
          bgmStateRef.current = "final"
          soundManager.playFinalBgm()
        }
      } else {
        if (bgmStateRef.current !== "battle") {
          bgmStateRef.current = "battle"
          soundManager.playBattleBgm()
        }
      }
    }

    checkBgm()
  }, [showBattleStart, winner])

  useEffect(() => {
    if (winner) {
      bgmStateRef.current = null
      soundManager.stopBgm()
    }
  }, [winner])

  useEffect(() => {
    if (battleStartIntervalRef.current) {
      clearInterval(battleStartIntervalRef.current)
      battleStartIntervalRef.current = null
    }

    if (battleStartCompletedRef.current) return

    soundManager.playBattleHorn()
    const text = "いざ尋常に"
    const phases = text.length + 2

    let phase = 0
    setBattleStartPhase(0)

    battleStartIntervalRef.current = setInterval(() => {
      phase++
      setBattleStartPhase(phase)
      if (phase <= text.length) {
        soundManager.playTaiko()
      }
      if (phase === text.length + 1) {
        soundManager.playTaiko()
        setTimeout(() => soundManager.playTaiko(), 100)
      }
      if (phase >= phases) {
        if (battleStartIntervalRef.current) {
          clearInterval(battleStartIntervalRef.current)
          battleStartIntervalRef.current = null
        }
        battleStartCompletedRef.current = true
        setTimeout(() => {
          setShowBattleStart(false)
          setBattlePhase("idle")
        }, 1200)
      }
    }, 350)

    return () => {
      if (battleStartIntervalRef.current) {
        clearInterval(battleStartIntervalRef.current)
        battleStartIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isPaused) {
      pauseResumeRef.current = {
        wasInMiddleOfPhase: battlePhase !== "idle" && battlePhase !== "battle-start",
        phase: battlePhase,
      }
    }
  }, [isPaused, battlePhase])

  const attackDataRef = useRef<{
    attacker: BattleCharacter | null
    defender: BattleCharacter | null
    attackerIndex: number
    defenderIndex: number
    totalDamage: number
    attackCount: number
    skillMessages: Array<{ message: string; side: "player" | "enemy"; type: string }>
  } | null>(null)

  const addLog = useCallback((message: string, type: LogEntry["type"], side?: "player" | "enemy") => {
    if (lastLogMessageRef.current === message) {
      return
    }
    lastLogMessageRef.current = message
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), message, type, side }])
    setLogId((prev) => prev + 1)
  }, [])

  const addStatusEffect = useCallback((charId: string, effect: StatusEffect) => {
    setStatusEffects((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(charId) || []
      newMap.set(charId, [...existing, effect])
      return newMap
    })
  }, [])

  const getActiveCharacter = (team: BattleCharacter[]): BattleCharacter | null => {
    return team.find((c) => !c.isDefeated) || null
  }

  const getNextCharacter = (team: BattleCharacter[], currentIndex: number): BattleCharacter | null => {
    for (let i = currentIndex + 1; i < team.length; i++) {
      if (!team[i].isDefeated) return team[i]
    }
    return null
  }

  const getDelay = useCallback((baseDelay: number) => baseDelay / speedMultiplier, [speedMultiplier])

  const showHeckleRef = useRef<(type: "buff" | "losing" | "winning") => void>(() => {})

  showHeckleRef.current = (type: "buff" | "losing" | "winning") => {
    const currentPlayer = playerRef.current
    const waitingPlayers = currentPlayer.filter((c, i) => {
      const activeIndex = currentPlayer.findIndex((p) => !p.isDefeated)
      return i > activeIndex && !c.isDefeated
    })

    if (waitingPlayers.length === 0) return
    if (Math.random() > 0.3) return

    const randomChar = waitingPlayers[Math.floor(Math.random() * waitingPlayers.length)]
    const voices = HECKLE_VOICES[type]
    const randomVoice = voices[Math.floor(Math.random() * voices.length)]

    const uniqueHeckleId = `${randomChar.template.id}-${Date.now()}`
    setHeckleDisplay({ uniqueId: uniqueHeckleId, charId: randomChar.template.id, voice: randomVoice })
    setTimeout(() => setHeckleDisplay(null), 2000)
  }

  useEffect(() => {
    if (hasAppliedStartSkillsRef.current || showBattleStart) return
    hasAppliedStartSkillsRef.current = true

    const applyStartSkills = (
      team: BattleCharacter[],
      teamName: string,
      setTeam: React.Dispatch<React.SetStateAction<BattleCharacter[]>>,
      side: "player" | "enemy",
    ) => {
      const newTeam = [...team]
      const buffQueue: Array<{ delay: number; action: () => void }> = []
      let delayOffset = 0

      newTeam.forEach((char, index) => {
        if (char.template.id === "musashi" && !char.isDefeated) {
          buffQueue.push({
            delay: delayOffset,
            action: () => {
              const targets: string[] = []
              if (index > 0 && !newTeam[index - 1].isDefeated) {
                targets.push(newTeam[index - 1].template.id)
              }
              if (index < newTeam.length - 1 && !newTeam[index + 1].isDefeated) {
                targets.push(newTeam[index + 1].template.id)
              }

              setBuffAnimation({
                isActive: true,
                targetCharIds: targets,
                targetUniqueId: `active-${side}`,
                message: `${char.template.name}の\n【勝てばよかろう】発動！`,
                iconType: "attack",
              })
              soundManager.playBuffSound()
              addLog(`${char.template.name}の【勝てばよかろう】発動！前後の味方の攻撃力+3`, "buff", side)
            },
          })

          buffQueue.push({
            delay: delayOffset + 600,
            action: () => {
              setTeam((prev) => {
                const updated = [...prev]
                if (index > 0 && !updated[index - 1].isDefeated) {
                  updated[index - 1].currentAttack += 3
                  addStatusEffect(updated[index - 1].template.id, { type: "buff", stat: "attack", value: 3 })
                }
                if (index < updated.length - 1 && !updated[index + 1].isDefeated) {
                  updated[index + 1].currentAttack += 3
                  addStatusEffect(updated[index + 1].template.id, { type: "buff", stat: "attack", value: 3 })
                }
                return updated
              })
              setBuffAnimation({
                isActive: false,
                targetCharIds: [],
                targetUniqueId: undefined,
                message: null,
                iconType: null,
              })
            },
          })
          delayOffset += 1200
        }

        if (char.template.id === "mitsuhide" && !char.isDefeated) {
          buffQueue.push({
            delay: delayOffset,
            action: () => {
              const allIds = newTeam.filter((c) => !c.isDefeated).map((c) => c.template.id)
              setBuffAnimation({
                isActive: true,
                targetCharIds: allIds,
                targetUniqueId: `active-${side}`,
                message: `${char.template.name}の\n【謀反の刃】発動！`,
                iconType: null,
              })
              soundManager.playDebuffSound()
              addLog(`${char.template.name}の【謀反の刃】発動！味方全員HP-3、自身攻撃+5`, "buff", side)
            },
          })

          buffQueue.push({
            delay: delayOffset + 600,
            action: () => {
              setTeam((prev) => {
                const updated = [...prev]
                updated.forEach((c) => {
                  if (!c.isDefeated) {
                    c.currentHp = Math.max(1, c.currentHp - 3)
                    addStatusEffect(c.template.id, { type: "debuff", stat: "hp", value: -3 })
                  }
                })
                const mitsuhide = updated.find((c) => c.template.id === "mitsuhide")
                if (mitsuhide) {
                  mitsuhide.currentAttack += 5
                  addStatusEffect(mitsuhide.template.id, { type: "buff", stat: "attack", value: 5 })
                }
                return updated
              })
              setBuffAnimation({
                isActive: false,
                targetCharIds: [],
                targetUniqueId: undefined,
                message: null,
                iconType: null,
              })
            },
          })
          delayOffset += 1200
        }
      })

      buffQueue.forEach(({ delay, action }) => {
        setTimeout(action, delay + 500)
      })
    }

    const initialPlayer = playerTeam.map(createBattleCharacter)
    const activePlayer = getActiveCharacter(initialPlayer)
    if (activePlayer) {
      setTimeout(() => {
        setDisplayState((prev) => ({ ...prev, attackerSpeech: activePlayer.template.voiceDeploy }))
        setDeployedCharIds(new Set([activePlayer.template.id]))
        setTimeout(() => {
          setDisplayState((prev) => ({ ...prev, attackerSpeech: null }))
        }, 2500)
      }, 300)
    }

    setTimeout(() => {
      applyStartSkills(playerRef.current, "味方", setPlayer, "player")
      applyStartSkills(enemyRef.current, "敵", setEnemy, "enemy")
    }, 500)
  }, [showBattleStart, playerTeam, addLog, addStatusEffect])

  useEffect(() => {
    if (winner || isPaused || battlePhase !== "idle" || buffAnimation.isActive || showBattleStart) return

    const activePlayer = getActiveCharacter(playerRef.current)
    const activeEnemy = getActiveCharacter(enemyRef.current)

    if (!activePlayer) {
      setWinner("enemy")
      setResult("enemy")
      addLog("敵軍の勝利なり！我が軍、無念の敗北...", "victory")
      return
    }
    if (!activeEnemy) {
      setWinner("player")
      setResult("player")
      addLog("我が軍の勝利なり！天晴れ！！", "victory")
      return
    }

    if (activePlayer && !deployedCharIds.has(activePlayer.template.id)) {
      setDisplayState((prev) => ({ ...prev, attackerSpeech: activePlayer.template.voiceDeploy }))
      setDeployedCharIds((prev) => new Set([...prev, activePlayer.template.id]))
      setTimeout(() => {
        setDisplayState((prev) => ({ ...prev, attackerSpeech: null }))
      }, getDelay(2000))
    }

    const alivePlayer = playerRef.current.filter((c) => !c.isDefeated).length
    const aliveEnemy = enemyRef.current.filter((c) => !c.isDefeated).length
    if (alivePlayer < aliveEnemy) {
      showHeckleRef.current("losing")
    } else if (alivePlayer > aliveEnemy) {
      showHeckleRef.current("winning")
    }

    const timer = setTimeout(() => {
      if (!isPausedRef.current) {
        startAttackSequence()
      }
    }, getDelay(1200))

    return () => clearTimeout(timer)
  }, [turn, winner, isPaused, battlePhase, deployedCharIds, buffAnimation.isActive, showBattleStart, getDelay, addLog])

  const startAttackSequence = useCallback(() => {
    if (isPausedRef.current) return

    const currentTurn = turnRef.current
    const currentPlayer = playerRef.current
    const currentEnemy = enemyRef.current

    const attacker = currentTurn === "player" ? getActiveCharacter(currentPlayer) : getActiveCharacter(currentEnemy)
    const defender = currentTurn === "player" ? getActiveCharacter(currentEnemy) : getActiveCharacter(currentPlayer)

    if (!attacker || !defender) return

    const attackerIndex =
      currentTurn === "player"
        ? currentPlayer.findIndex((c) => c === attacker)
        : currentEnemy.findIndex((c) => c === attacker)
    const defenderIndex =
      currentTurn === "player"
        ? currentEnemy.findIndex((c) => c === defender)
        : currentPlayer.findIndex((c) => c === defender)

    attacker.turnCount++

    const attackCount = attacker.template.id === "nobunaga" && attacker.turnCount % 3 === 0 ? 2 : 1
    const skillMessages: Array<{ message: string; side: "player" | "enemy"; type: string }> = []

    if (attackCount === 2) {
      skillMessages.push({
        message: attacker.template.voiceSkill,
        side: currentTurn,
        type: "skill",
      })
      addLog(`${attacker.template.name}の【二段撃ち】発動！`, "skill", currentTurn)
      soundManager.playBuffSound() // 効果音追加
      setSpecialSkillEffect({ type: "double-attack", side: currentTurn })
      setDisplayState((prev) => ({
        ...prev,
        skillName: "二段撃ち",
        skillSide: currentTurn,
      }))
      setTimeout(() => {
        setSpecialSkillEffect({ type: null, side: null })
        setDisplayState((prev) => ({ ...prev, skillName: null }))
      }, 1000)
    }

    attackDataRef.current = {
      attacker,
      defender,
      attackerIndex,
      defenderIndex,
      totalDamage: 0,
      attackCount,
      skillMessages,
    }

    setAttackingSide(currentTurn)
    setBattlePhase("pre-attack")
  }, [addLog])

  useEffect(() => {
    if (
      isPaused ||
      battlePhase === "idle" ||
      battlePhase === "battle-start" ||
      buffAnimation.isActive ||
      showBattleStart
    )
      return

    const data = attackDataRef.current
    if (!data) return

    const currentTurn = turnRef.current
    const { attacker, defender, attackerIndex, defenderIndex, attackCount, skillMessages } = data
    if (!attacker || !defender) return

    const setAttackerTeam = currentTurn === "player" ? setPlayer : setEnemy
    const setDefenderTeam = currentTurn === "player" ? setEnemy : setPlayer
    const defenderSide = currentTurn === "player" ? "enemy" : "player"

    let timer: NodeJS.Timeout
    const currentBattleKey = battleKeyRef.current

    switch (battlePhase) {
      case "pre-attack":
        if (skillMessages.length > 0) {
          setDisplayState((prev) => ({
            ...prev,
            attackerSpeech: skillMessages[0].message,
            skillType: "fire",
            skillSide: currentTurn,
          }))
        }
        timer = setTimeout(() => {
          if (!isPausedRef.current) setBattlePhase("charge")
        }, getDelay(400))
        break

      case "charge":
        timer = setTimeout(() => {
          if (!isPausedRef.current) setBattlePhase("clash")
        }, getDelay(300))
        break

      case "clash":
        soundManager.playSwordSound()

        let totalDamage = 0
        let defenderSkillTriggered = false
        let defenderSkillMessage = ""
        let defenderSkillType = ""

        for (let i = 0; i < attackCount; i++) {
          let damage = attacker.currentAttack + attacker.attackBonus

          if (attacker.template.id === "masamune" && attacker.currentHp <= attacker.template.maxHp / 2) {
            damage *= 2
            const skillKey = `masamune-dragon-${attacker.uniqueInstanceId || attackerIndex}-${currentBattleKey}`
            if (!activatedSkills.has(skillKey)) {
              setActivatedSkills((prev) => new Set([...prev, skillKey]))
              addLog(`${attacker.template.name}の【竜の眼光】発動！攻撃力2倍なり！`, "buff", currentTurn)
              soundManager.playBuffSound()
              setBuffAnimation({
                isActive: true,
                targetCharIds: [attacker.template.id],
                targetUniqueId: `active-${currentTurn}`,
                message: "竜の眼光！",
                iconType: "attack",
              })
              setTimeout(() => {
                setBuffAnimation({
                  isActive: false,
                  targetCharIds: [],
                  targetUniqueId: undefined,
                  message: null,
                  iconType: null,
                })
              }, 500)
            }
          }

          if (defender.template.id === "hanzo" && Math.random() < 0.4) {
            defenderSkillTriggered = true
            defenderSkillMessage = defender.template.voiceSkill
            defenderSkillType = "buff"
            addLog(`${defender.template.name}の【忍びの術】発動！攻撃を見切ったり！`, "skill", defenderSide)
            setSpecialSkillEffect({ type: "ninja", side: currentTurn === "player" ? "enemy" : "player" })
            setTimeout(() => setSpecialSkillEffect({ type: null, side: null }), 800)
            continue
          }

          if (defender.template.id === "shingen" && defender.currentHp <= defender.template.maxHp / 2) {
            const reducedDamage = Math.max(1, damage - 1)
            const skillKey = `shingen-stance-${currentBattleKey}`
            if (!activatedSkills.has(skillKey)) {
              setActivatedSkills((prev) => new Set([...prev, skillKey]))
              defenderSkillTriggered = true
              defenderSkillMessage = defender.template.voiceSkill
              defenderSkillType = "counter"

              setAttackerTeam((prev) => {
                const updated = [...prev]
                const attackerChar = updated[attackerIndex]
                if (attackerChar) {
                  attackerChar.currentAttack = Math.max(1, attackerChar.currentAttack - 2)
                  addStatusEffect(attackerChar.template.id, { type: "debuff", stat: "attack", value: -2 })
                }
                return updated
              })
              soundManager.playDebuffSound()
              addLog(`${defender.template.name}の【不動の構え】発動！被害1減、相手攻撃力2減！`, "skill", defenderSide)
              setBuffAnimation({
                isActive: true,
                targetCharIds: [defender.template.id],
                targetUniqueId: `active-${defenderSide}`,
                message: "不動の構え！",
                iconType: "defense",
              })
              setTimeout(() => {
                setBuffAnimation({
                  isActive: false,
                  targetCharIds: [],
                  targetUniqueId: undefined,
                  message: null,
                  iconType: null,
                })
              }, 500)
            }
            damage = reducedDamage
          }

          totalDamage += damage
        }

        attackDataRef.current = { ...data, totalDamage }

        if (defenderSkillTriggered) {
          setDisplayState((prev) => ({
            ...prev,
            defenderSpeech: defenderSkillMessage,
            skillType: defenderSkillType,
            skillSide: currentTurn === "player" ? "enemy" : "player",
          }))
        }

        timer = setTimeout(() => {
          if (!isPausedRef.current) setBattlePhase("damage")
        }, getDelay(200))
        break

      case "damage":
        const dmg = attackDataRef.current?.totalDamage ?? 0

        if (dmg > 0) {
          const defenderSideForAnim = currentTurn === "player" ? "enemy" : "player"
          setDamageReceivedAnim({
            isActive: true,
            targetSide: defenderSideForAnim,
          })
          setTimeout(() => {
            setDamageReceivedAnim({ isActive: false, targetSide: null })
          }, 400)

          setDisplayState((prev) => ({
            ...prev,
            damage: dmg,
            damageIsHeal: false,
            damageSide: currentTurn === "player" ? "enemy" : "player",
            attackerSpeech: null,
          }))

          setDefenderTeam((prev) => {
            const newTeam = [...prev]
            const target = newTeam[defenderIndex]
            let newHp = target.currentHp - dmg

            if (newHp <= 0 && target.template.id === "kenshin" && !target.hasUsedLastStand) {
              target.hasUsedLastStand = true
              newHp = 1
              addLog(`${target.template.name}の【負けん気】発動！残りHP1にて耐えたり！`, "skill", defenderSide)

              const nextChar = getNextCharacter(newTeam, defenderIndex)
              if (nextChar) {
                nextChar.currentHp = Math.max(1, nextChar.currentHp - 5)
                addStatusEffect(nextChar.template.id, { type: "debuff", stat: "hp", value: -5 })
                addLog(`後続の${nextChar.template.name}、HP5減りたり`, "debuff", defenderSide)
              }
            }

            target.currentHp = Math.max(0, newHp)
            return newTeam
          })

          addLog(
            `${attacker.template.name}の攻撃！${defender.template.name}に${dmg}の損害を与えん！`,
            "normal",
            currentTurn,
          )
        }

        timer = setTimeout(() => {
          if (!isPausedRef.current) setBattlePhase("post-attack")
        }, getDelay(800))
        break

      case "post-attack":
        if (attacker.template.id === "yukimura") {
          const skillKey = `yukimura-buff-${currentTurn}-turn-${attacker.turnCount}-${currentBattleKey}`
          if (!activatedSkills.has(skillKey)) {
            const currentBonus = attacker.attackBonus
            if (currentBonus < 10) {
              // 端数切り捨て: 10を超えないように計算
              const addedBonus = Math.min(2, 10 - currentBonus)
              const newBonus = currentBonus + addedBonus

              setActivatedSkills((prev) => new Set([...prev, skillKey]))

              setAttackerTeam((prev) => {
                const newTeam = [...prev]
                const char = newTeam[attackerIndex]
                // アクティブな攻撃者のみを更新
                if (char && char.template.id === "yukimura") {
                  char.attackBonus = newBonus
                }
                return newTeam
              })

              addStatusEffect(attacker.template.id, { type: "buff", stat: "attack", value: addedBonus })
              setDisplayState((prev) => ({
                ...prev,
                attackerSpeech: attacker.template.voiceSkill,
                skillType: "fire",
                skillSide: currentTurn,
              }))
              soundManager.playBuffSound()
              addLog(`${attacker.template.name}の【自信過剰】発動！攻撃力+${addedBonus}！`, "buff", currentTurn)
              addLog(
                `${attacker.template.name}の攻撃力が${attacker.currentAttack + newBonus}になった！`,
                "buff",
                currentTurn,
              )

              setBuffAnimation({
                isActive: true,
                targetCharIds: [attacker.template.id],
                targetUniqueId: `active-${currentTurn}`,
                message: null,
                iconType: "attack",
              })

              if (currentTurn === "player") {
                showHeckleRef.current("buff")
              }
              setTimeout(() => {
                setBuffAnimation({
                  isActive: false,
                  targetCharIds: [],
                  targetUniqueId: undefined,
                  message: null,
                  iconType: null,
                })
              }, 400)
            }
          }
        }

        if (defender.isDefeated && defenderSide === "enemy") {
          setKillCounts((prev) => {
            const currentCount = prev.get(attacker.template.id) || 0
            return new Map(prev).set(attacker.template.id, currentCount + 1)
          })
        }

        if (defender.currentHp <= 0 && !defender.isDefeated) {
          defender.isDefeated = true
          addLog(`${defender.template.name}、討ち死にせり！`, "defeat", defenderSide)

          const uniqueDefeatId = `defeat-${defender.template.id}-${defenderIndex}-${Date.now()}`
          setTimeout(() => {
            setDefeatVoice({
              uniqueInstanceId: uniqueDefeatId,
              charId: defender.template.id,
              voice: defender.template.voiceDefeat,
            })
            setTimeout(() => setDefeatVoice(null), 3000)
          }, 800)

          if (attacker.template.id === "ieyasu") {
            setAttackerTeam((prevA) => {
              const newTeamA = [...prevA]
              const ieyasuChar = newTeamA.find((c) => c.template.id === "ieyasu")
              if (ieyasuChar && !ieyasuChar.isDefeated) {
                const healAmount = 12
                ieyasuChar.currentHp = Math.min(ieyasuChar.template.maxHp, ieyasuChar.currentHp + healAmount)
                addLog(`${ieyasuChar.template.name}の【堅実家】発動！HP12回復せり！`, "buff", currentTurn)
              }
              return newTeamA
            })
          }

          if (attacker.template.id === "hideyoshi") {
            const newTeam = setDefenderTeam === setEnemy ? player : enemy
            const nextEnemy = newTeam.find((c) => !c.isDefeated)
            if (nextEnemy) {
              nextEnemy.currentAttack = Math.max(1, nextEnemy.currentAttack - 4)
              addStatusEffect(nextEnemy.template.id, { type: "debuff", stat: "attack", value: -4 })
              soundManager.playDebuffSound()
              addLog(
                `${attacker.template.name}の【調略】発動！${nextEnemy.template.name}の攻撃力4減りたり！`,
                "debuff",
                currentTurn,
              )
            }
          }
        }

        timer = setTimeout(() => {
          if (!isPausedRef.current) setBattlePhase("fadeout")
        }, getDelay(600))
        break

      case "fadeout":
        setDisplayState({
          attackerSpeech: null,
          defenderSpeech: null,
          damage: null,
          damageIsHeal: false,
          damageSide: null,
          skillType: null,
          skillSide: null,
          skillName: null,
        })
        setAttackingSide(null)
        attackDataRef.current = null

        timer = setTimeout(() => {
          if (!isPausedRef.current) {
            setBattlePhase("idle")
            setTurn((prev) => (prev === "player" ? "enemy" : "player"))
          }
        }, getDelay(300))
        break
    }

    return () => clearTimeout(timer)
  }, [battlePhase, isPaused, getDelay, addLog, addStatusEffect, buffAnimation.isActive, activatedSkills])

  const surrender = () => {
    setShowSurrenderConfirm(false)
    setWinner("enemy")
    setResult("enemy")
    addLog("我が軍、降伏せり...無念なり", "victory")
    onDefeat?.()
  }

  const debugForceWin = () => {
    setWinner("player")
    setResult("player")
    addLog("【デバッグ】強制勝利！", "victory")
  }

  const reset = useCallback(() => {
    soundManager.stopBgm()
    const newPlayerTeam = playerTeam.map(createBattleCharacter)
    const newEnemyTeam = createEnemyTeam()

    const playerActive = newPlayerTeam.find((c) => !c.isDefeated)
    const enemyActive = newEnemyTeam.find((c) => !c.isDefeated)
    let firstTurn: "player" | "enemy" = "player"
    if (playerActive && enemyActive) {
      if (playerActive.template.speed > enemyActive.template.speed) {
        firstTurn = "player"
      } else if (playerActive.template.speed < enemyActive.template.speed) {
        firstTurn = "enemy"
      } else {
        firstTurn = Math.random() > 0.5 ? "player" : "enemy"
      }
    }

    battleKeyRef.current = Date.now()
    lastLogMessageRef.current = ""

    setPlayer(newPlayerTeam)
    setEnemy(newEnemyTeam)
    setTurn(firstTurn)
    setLogs([])
    setLogId(0)
    setWinner(null)
    setResult(null)
    setBattlePhase("battle-start")
    setAttackingSide(null)
    setDisplayState({
      attackerSpeech: null,
      defenderSpeech: null,
      damage: null,
      damageIsHeal: false,
      damageSide: null,
      skillType: null,
      skillSide: null,
      skillName: null,
    })
    setStatusEffects(new Map())
    setBuffAnimation({ isActive: false, targetCharIds: [], targetUniqueId: undefined, message: null, iconType: null })
    setSpecialSkillEffect({ type: null, side: null })
    setDeployedCharIds(new Set())
    setHoveredChar(null)
    setActivatedSkills(new Set())
    setDefeatVoice(null)
    setShowSurrenderConfirm(false)
    battleStartCompletedRef.current = false
    setShowBattleStart(true)
    setBattleStartPhase(0)
    hasAppliedStartSkillsRef.current = false
    bgmStateRef.current = null
    pauseResumeRef.current = { wasInMiddleOfPhase: false, phase: "idle" }
    setKillCounts(new Map())
    setIsPaused(false) // 一時停止状態もリセット

    setTimeout(() => {
      if (battleStartIntervalRef.current) {
        clearInterval(battleStartIntervalRef.current)
      }

      const text = "いざ尋常に"
      const phases = text.length + 2

      let phase = 0
      setBattleStartPhase(0)

      battleStartIntervalRef.current = setInterval(() => {
        phase++
        setBattleStartPhase(phase)
        if (phase <= text.length) {
          soundManager.playTaiko()
        }
        if (phase === text.length + 1) {
          soundManager.playTaiko()
          setTimeout(() => soundManager.playTaiko(), 100)
        }
        if (phase >= phases) {
          if (battleStartIntervalRef.current) {
            clearInterval(battleStartIntervalRef.current)
            battleStartIntervalRef.current = null
          }
          battleStartCompletedRef.current = true
          setTimeout(() => {
            setShowBattleStart(false)
            setBattlePhase("idle")
          }, 1200)
        }
      }, 350)
    }, 100)
  }, [playerTeam, createEnemyTeam, onDefeat])

  const activePlayer = getActiveCharacter(player)
  const activeEnemy = getActiveCharacter(enemy)
  const alivePlayerCount = player.filter((c) => !c.isDefeated).length
  const aliveEnemyCount = enemy.filter((c) => !c.isDefeated).length

  const getStatModifiers = (charId: string) => {
    const effects = statusEffects.get(charId) || []
    const attackMod = effects.filter((e) => e.stat === "attack").reduce((sum, e) => sum + e.value, 0)
    const hpMod = effects.filter((e) => e.stat === "hp").reduce((sum, e) => sum + e.value, 0)
    return { attackMod, hpMod }
  }

  const renderCharacterIcon = (
    char: BattleCharacter,
    side: "player" | "enemy",
    isActive: boolean,
    showSpeech?: string | null,
    animationClass?: string,
    instanceId?: string,
  ) => {
    const isBuffTarget =
      buffAnimation.targetCharIds.includes(char.template.id) &&
      buffAnimation.isActive &&
      (!buffAnimation.targetUniqueId || (buffAnimation.targetUniqueId === `active-${side}` && isActive))

    const isDamageReceived = damageReceivedAnim.isActive && damageReceivedAnim.targetSide === side && isActive

    const { attackMod, hpMod } = getStatModifiers(char.template.id)

    const showHeckleVoice =
      heckleDisplay &&
      heckleDisplay.charId === char.template.id &&
      !char.isDefeated &&
      !isActive &&
      instanceId?.startsWith("waiting-")

    const handleMouseEnter = (e: React.MouseEvent) => {
      setHoveredChar(char)
      setTooltipPosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
      setTooltipPosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseLeave = () => {
      setHoveredChar(null)
    }

    const attackAnimClass =
      isActive && attackingSide === side && battlePhase === "charge"
        ? side === "player"
          ? "animate-charge-right"
          : "animate-charge-left"
        : isActive && attackingSide === side && battlePhase === "clash"
          ? "animate-clash-impact"
          : ""

    const damageAnimClass = isDamageReceived ? "animate-damage-shake" : ""

    const showSpecialEffect = isActive && specialSkillEffect.type !== null && specialSkillEffect.side === side

    const showSkillName = isActive && displayState.skillName && displayState.skillSide === side

    return (
      <div
        className={`relative flex flex-col items-center transition-all duration-300 ${animationClass || ""} ${attackAnimClass} ${damageAnimClass}`}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {showSpeech && (
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg text-center whitespace-pre-line min-w-[100px] max-w-[160px] border border-gray-600 leading-relaxed">
              {showSpeech}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        )}

        {showSkillName && (
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
            <div className="bg-yellow-600 text-white text-lg px-4 py-2 rounded-lg shadow-lg text-center font-bold border-2 border-yellow-400">
              【{displayState.skillName}】
            </div>
          </div>
        )}

        {showHeckleVoice && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
            <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded-lg shadow-lg text-center whitespace-pre-line min-w-[70px] max-w-[120px] border border-gray-600 leading-relaxed">
              {heckleDisplay!.voice}
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        )}

        {isBuffTarget && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <span className="text-3xl animate-buff-boom">
              {buffAnimation.iconType === "attack" ? "💪" : buffAnimation.iconType === "defense" ? "🛡️" : "✨"}
            </span>
          </div>
        )}

        {showSpecialEffect && specialSkillEffect.type === "ninja" && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <span className="text-4xl animate-bounce">🥷</span>
            <span className="absolute -top-4 text-lg text-white font-bold animate-fade-in">回避！</span>
          </div>
        )}

        {showSpecialEffect && specialSkillEffect.type === "double-attack" && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <span className="text-3xl animate-pulse">🔥🔥</span>
          </div>
        )}

        <div
          className={`relative ${isBuffTarget ? "animate-buff-boom" : ""} ${isDamageReceived ? "animate-damage-shake" : ""}`}
        >
          {isActive && (
            <div className="mb-3">
              <div
                className={`h-3 rounded-full overflow-hidden ${char.currentHp / char.template.maxHp > 0.5 ? "bg-green-900" : char.currentHp / char.template.maxHp > 0.25 ? "bg-yellow-900" : "bg-red-900"}`}
                style={{ width: 140 }}
              >
                <div
                  className={`h-full transition-all duration-300 ${char.currentHp / char.template.maxHp > 0.5 ? "bg-green-500" : char.currentHp / char.template.maxHp > 0.25 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${(char.currentHp / char.template.maxHp) * 100}%` }}
                />
              </div>
              <div className="text-center text-white text-xs font-bold mt-0.5">
                {char.currentHp}/{char.template.maxHp}
              </div>
            </div>
          )}

          <CharacterCard
            char={char.template}
            isActive={isActive}
            side={side}
            className={`
              ${char.isDefeated ? "brightness-50 grayscale" : ""}
            `}
          />

          {char.isDefeated && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
              <span className="text-white font-bold text-lg animate-defeated-pulse">敗北</span>
            </div>
          )}

          <div
            className={`absolute bottom-0 left-0 right-0 p-1 text-center rounded-b-lg ${side === "player" ? "bg-red-900/80" : "bg-blue-900/80"}`}
          >
            <div className="text-white text-xs font-bold truncate">{char.template.name}</div>
          </div>
        </div>

        <div className="mt-1 text-xs text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-orange-400">攻撃力</span>
            <span className="text-white">{char.currentAttack + char.attackBonus}</span>
            {attackMod !== 0 && (
              <span className={attackMod > 0 ? "text-green-400" : "text-orange-400"}>
                {attackMod > 0 ? `▲+${attackMod}` : `▼${attackMod}`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-blue-400">体力</span>
            <span className="text-white">{char.currentHp}</span>
            {hpMod !== 0 && (
              <span className={hpMod > 0 ? "text-green-400" : "text-orange-400"}>
                {hpMod > 0 ? `▲+${hpMod}` : `▼${hpMod}`}
              </span>
            )}
          </div>
          {isActive && (
            <div className="text-yellow-400 text-sm font-bold mt-1 bg-gray-800/80 px-2 py-0.5 rounded">
              速さ {char.template.speed}
            </div>
          )}
        </div>
      </div>
    )
  }

  const text = "いざ尋常に"
  const showShoubu = battleStartPhase > text.length

  return (
    <div
      className="min-h-screen p-4 relative"
      style={{
        backgroundImage: "url('/images/battle-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      {showBattleStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-4">
              {text.split("").map((char, i) => (
                <span
                  key={i}
                  className={`text-5xl font-bold text-yellow-400 transition-all duration-300 ${
                    battleStartPhase > i ? "opacity-100 scale-100" : "opacity-0 scale-50"
                  }`}
                  style={{
                    textShadow: "0 0 20px rgba(234,179,8,0.8), 0 0 40px rgba(234,179,8,0.6)",
                  }}
                >
                  {char}
                </span>
              ))}
            </div>
            {showShoubu && (
              <div
                className="text-7xl font-bold text-red-500 animate-shoubu"
                style={{
                  textShadow: "0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.6)",
                }}
              >
                勝負！
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="bg-black/60 px-4 py-2 rounded-lg">
            <span className="text-blue-400 font-bold text-lg">敵軍編成</span>
            <span className="text-white text-xl font-bold ml-2">
              {aliveEnemyCount}/{enemy.length}
            </span>
          </div>
          <div className="text-2xl text-yellow-400 font-bold">敵軍 ⚔️ 味方軍</div>
          <div className="bg-black/60 px-4 py-2 rounded-lg">
            <span className="text-red-400 font-bold text-lg">自軍編成</span>
            <span className="text-white text-xl font-bold ml-2">
              {alivePlayerCount}/{player.length}
            </span>
          </div>
        </div>

        <div className="w-full h-[2px] bg-white/30 my-2" />

        <div className="flex justify-between mb-4">
          {/* 敵の控え - 左側 */}
          <div className="flex gap-2 items-end">
            {enemy.some((c) => c.isDefeated) && (
              <>
                {enemy
                  .filter((c) => c.isDefeated)
                  .map((char, i) => (
                    <div key={`defeated-enemy-${char.template.id}-${i}`}>
                      {renderCharacterIcon(char, "enemy", false, undefined, undefined, `defeated-enemy-${i}`)}
                    </div>
                  ))}
                <div className="w-px h-20 bg-gray-600 mx-2" />
              </>
            )}
            {enemy
              .filter((c) => !c.isDefeated)
              .slice(1)
              .reverse()
              .map((char, i, arr) => (
                <div key={char.template.id + i}>
                  {i === arr.length - 1 && <div className="text-blue-400 text-xs text-center mb-1">▼次</div>}
                  {i !== arr.length - 1 && <div className="h-4 mb-1" />}
                  {renderCharacterIcon(char, "enemy", false, undefined, undefined, `waiting-enemy-${i}`)}
                </div>
              ))}
          </div>

          <div className="flex gap-2 items-end flex-row-reverse">
            {player
              .filter((c) => !c.isDefeated)
              .slice(1)
              .reverse()
              .map((char, i, arr) => (
                <div key={char.template.id + i}>
                  {i === arr.length - 1 && <div className="text-red-400 text-xs text-center mb-1">▼次</div>}
                  {i !== arr.length - 1 && <div className="h-4 mb-1" />}
                  {renderCharacterIcon(char, "player", false, undefined, undefined, `waiting-player-${i}`)}
                </div>
              ))}
            {player.some((c) => c.isDefeated) && (
              <>
                <div className="w-px h-20 bg-gray-600 mx-2" />
                {player
                  .filter((c) => c.isDefeated)
                  .map((char, i) => (
                    <div key={`defeated-player-${char.template.id}-${i}`}>
                      {renderCharacterIcon(char, "player", false, undefined, undefined, `defeated-player-${i}`)}
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center gap-8 my-8 min-h-[220px]">
          {activeEnemy &&
            renderCharacterIcon(
              activeEnemy,
              "enemy",
              true,
              turn === "enemy" ? displayState.attackerSpeech : displayState.defenderSpeech,
            )}

          <div className="text-6xl">⚔️</div>

          {activePlayer &&
            renderCharacterIcon(
              activePlayer,
              "player",
              true,
              turn === "player" ? displayState.attackerSpeech : displayState.defenderSpeech,
            )}
        </div>

        {displayState.damage !== null && (
          <div
            className={`absolute top-1/2 ${displayState.damageSide === "player" ? "right-1/4" : "left-1/4"} -translate-y-1/2 text-4xl font-bold animate-damage-pop z-20`}
          >
            <span className={displayState.damageIsHeal ? "text-green-400" : "text-red-400"}>
              {displayState.damageIsHeal ? "+" : "-"}
              {displayState.damage}
            </span>
          </div>
        )}

        {buffAnimation.message && buffAnimation.isActive && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="bg-black/90 text-yellow-400 text-xl px-6 py-3 rounded-lg shadow-lg text-center whitespace-pre-line border-2 border-yellow-600 animate-buff-boom">
              {buffAnimation.message}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mb-3 mt-4">
          <Button
            onClick={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            disabled={!!winner}
          >
            {speedMultiplier === 1 ? "倍速なり" : speedMultiplier === 2 ? "四倍速なり" : "等速なり"}
          </Button>
          <Button
            onClick={() => setIsPaused(!isPaused)}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            disabled={!!winner}
          >
            {isPaused ? "再開じゃ！" : "待った！"}
          </Button>
          <Button
            onClick={() => setShowSurrenderConfirm(true)}
            variant="outline"
            className="bg-red-900 border-red-700 text-white hover:bg-red-800"
            disabled={!!winner}
          >
            降参じゃ...
          </Button>
  </div>
          {/* --- Debug Skull Button --- */}
  <div className="relative group ml-auto">
          <button
              onClick={debugForceWin}
              disabled={!!winner}
              className="w-8 h-8 rounded-full bg-purple-900 border border-purple-700 
                 flex items-center justify-center text-lg hover:bg-purple-700 opacity-40 hover:opacity-100"
              aria-label="デバッグボタン（強制勝利）"
             >
            💀
          </button>
           
 {/* ツールチップ */}
    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 
                    bg-black/80 text-white text-xs px-2 py-1 rounded 
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
      デバッグ用にズルして勝つボタン
    </div>
   </div>       


        </div>

        <AlertDialog open={showSurrenderConfirm} onOpenChange={setShowSurrenderConfirm}>
          <AlertDialogContent className="bg-gray-900 border-red-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400 text-xl">降参確認</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                本当に降参してよろしいですか？敗北となります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
                まだ戦える！
              </AlertDialogCancel>
              <AlertDialogAction onClick={surrender} className="bg-red-600 text-white hover:bg-red-500">
                降参する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div ref={logContainerRef} className="bg-black/80 rounded-lg p-3 h-40 overflow-y-auto border border-gray-700">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`text-sm mb-1 ${
                log.type === "skill"
                  ? "text-yellow-400"
                  : log.type === "defeat"
                    ? "text-red-400"
                    : log.type === "victory"
                      ? "text-green-400"
                      : log.type === "buff"
                        ? "text-green-300"
                        : log.type === "debuff"
                          ? "text-orange-400"
                          : "text-gray-300"
              }`}
            >
              {log.side && (
                <span className={log.side === "player" ? "text-red-500 font-bold" : "text-blue-500 font-bold"}>
                  {log.side === "player" ? "【味方】" : "【敵】"}
                </span>
              )}
              {log.message}
            </div>
          ))}
        </div>

        {winner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <h2
                className={`text-5xl font-bold mb-6 ${winner === "player" ? "text-yellow-400" : "text-red-400"}`}
                style={{
                  textShadow: winner === "player" ? "0 0 20px rgba(234,179,8,0.8)" : "0 0 20px rgba(239,68,68,0.8)",
                }}
              >
                {winner === "player" ? "我軍の勝利！" : "敗北..."}
              </h2>

              {winner === "player" && (
                <p className="text-white text-xl mb-4">
                  討伐数: <span className="text-yellow-400 font-bold">{winStreak + 1}</span>/3
                </p>
              )}

              <div className="flex gap-4 justify-center flex-col items-center">
                {winner === "player" && winStreak < 2 && (
                  <Button
                    onClick={() => {
                      const mvpEntry = Array.from(killCounts.entries()).sort((a, b) => b[1] - a[1])[0]
                      const mvpChar = mvpEntry ? player.find((p) => p.template.id === mvpEntry[0]) : null
                      onVictory?.({
                        name: mvpChar?.template.name || "勇者",
                        kills: mvpEntry?.[1] || 0,
                      })
                      onNextBattle?.()
                    }}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-2xl px-12 py-6 font-bold"
                    style={{ textShadow: "0 0 10px rgba(0,0,0,0.5)" }}
                  >
                    次の戦へ
                  </Button>
                )}

                {winner === "player" && winStreak >= 2 && (
                  <Button
                    onClick={() => {
                      const mvpEntry = Array.from(killCounts.entries()).sort((a, b) => b[1] - a[1])[0]
                      const mvpChar = mvpEntry ? player.find((p) => p.template.id === mvpEntry[0]) : null
                      onVictory?.({
                        name: mvpChar?.template.name || "勇者",
                        kills: mvpEntry?.[1] || 0,
                      })
                    }}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-2xl px-12 py-6 font-bold animate-pulse"
                    style={{ textShadow: "0 0 10px rgba(0,0,0,0.5)" }}
                  >
                    天下統一！
                  </Button>
                )}

                {winner === "enemy" && (
                  <>
                    <Button
                      onClick={() => {
                        onDefeat?.()
                        reset()
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      もう一度
                    </Button>
                    <Button
                      onClick={() => {
                        onDefeat?.()
                        onBack()
                      }}
                      variant="outline"
                      className="border-gray-500 text-gray-300 hover:bg-gray-800"
                    >
                      編成に戻る
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {hoveredChar && (
          <div
            className="fixed z-50 bg-gray-900/95 text-white p-3 rounded-lg shadow-xl border border-gray-600 max-w-xs pointer-events-none"
            style={{
              left: tooltipPosition.x + 15,
              top: tooltipPosition.y + 15,
            }}
          >
            <div className="font-bold text-yellow-400 mb-1">{hoveredChar.template.name}</div>
            <div className="text-sm text-gray-300 mb-2">
              【{hoveredChar.template.skillName}】
              <br />
              {hoveredChar.template.skillDescription}
            </div>
            <div className="text-xs text-gray-400 border-t border-gray-600 pt-2 mt-2">
              <div className="font-bold mb-1">現在の状態:</div>
              {(() => {
                const effects = statusEffects.get(hoveredChar.template.id) || []
                const attackEffects = effects.filter((e) => e.stat === "attack")
                const hpEffects = effects.filter((e) => e.stat === "hp")
                if (attackEffects.length === 0 && hpEffects.length === 0) {
                  return <div>バフ/デバフなし</div>
                }
                return (
                  <>
                    {attackEffects.map((e, i) => (
                      <div key={`atk-${i}`} className={e.value > 0 ? "text-green-400" : "text-orange-400"}>
                        攻撃力 {e.value > 0 ? `+${e.value}` : e.value}
                      </div>
                    ))}
                    {hpEffects.map((e, i) => (
                      <div key={`hp-${i}`} className={e.value > 0 ? "text-green-400" : "text-orange-400"}>
                        体力 {e.value > 0 ? `+${e.value}` : e.value}
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
  )
}
