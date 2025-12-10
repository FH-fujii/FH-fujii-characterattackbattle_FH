"use client"

import { useState, useEffect, useRef } from "react"
import { soundManager } from "@/lib/sounds"

interface EndingScreenProps {
  mvp: { name: string; kills: number } | null
  onRestart: () => void
}

export function EndingScreen({ mvp, onRestart }: EndingScreenProps) {
  const [phase, setPhase] = useState<"title" | "fadeText" | "scroll" | "button">("title")
  const [scrollPosition, setScrollPosition] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const mvpName = mvp?.name || "我が軍の勇者たち"

  const storyText = `天正の世、乱世に終止符を打つべく、一人の覇者が立ち上がった。

幾多の戦いを経て、我が軍は三度の大勝利を収めた。
血と汗と涙の果てに、ついに天下統一の野望は果たされたのである。

━━━━━━━━━━━━━━━━━━━━━━

この戦いにおいて、特に${mvpName}の活躍は目覚ましかった。
その武勇は敵軍を震え上がらせ、味方の士気を大いに高めた。

戦場にて、${mvpName}は常に先陣を切り、
幾多の敵将を討ち取った。
その名は瞬く間に日本中に轟き、
恐れと畏敬の念を持って語られるようになった。

━━━━━━━━━━━━━━━━━━━━━━

かくして、長き戦乱の世は幕を閉じた。

焼け野原となった大地には、やがて新しい芽が吹き出し、
人々は再び田畑を耕し、商いを始めた。

子供たちの笑い声が響き渡る平和な世が訪れたのである。

城下町は活気を取り戻し、
商人たちは自由に行き来できるようになった。
農民たちは年貢の重さに苦しむことなく、
実りの秋を迎えられるようになった。

━━━━━━━━━━━━━━━━━━━━━━

しかし、歴史は繰り返す。

いつの日か、再び英雄を求める時代が来るやもしれぬ。
その時、民は語り継ぐであろう。

「かつて、この地には偉大なる武将がおった」と。

「${mvpName}をはじめとする勇者たちが、
己の命を賭して、この国を守り抜いたのだ」と。

━━━━━━━━━━━━━━━━━━━━━━

この物語は、そんな英雄たちへの鎮魂歌である。

彼らの名は、永遠に歴史に刻まれるであろう。
その武勇と忠義を称え、後世に語り継がれるであろう。

天下泰平の礎となった者たちよ、安らかに眠れ。

━━━━━━━━━━━━━━━━━━━━━━


【 完 】


制作: 炎魂制作委員会
企画・開発: v0
音楽: v0
スペシャルサンクス: プレイヤーの皆様


遊んでいただき、誠にありがとうございました。`

  // ▼ 演出フェーズ制御
  useEffect(() => {
    soundManager.stopBgm()

    // タイトルを 3秒しっかり表示
    setTimeout(() => setPhase("fadeText"), 3000)

    // サブタイトル表示 → 合わせてフェードアウト → 1秒後スクロール開始
    setTimeout(() => {
      setPhase("scroll")
      try {
        soundManager.playEndingBgm()
      } catch {}
    }, 3000 + 2800 + 1000) // タイトル3秒 + サブタイトル演出2.8秒 + 1秒待ち
  }, [])

  // ▼ エンディングロール開始
  useEffect(() => {
    if (phase !== "scroll") return

    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 1.5)
    }, 30)

    return () => clearInterval(interval)
  }, [phase])

  // ▼ ボタン表示条件
  useEffect(() => {
    if (!containerRef.current || phase !== "scroll") return

    const contentHeight =
      containerRef.current.querySelector(".ending-content")?.clientHeight ?? 0
    const screenHeight = containerRef.current.clientHeight

    if (scrollPosition >= contentHeight - screenHeight + 200) {
      setPhase("button")
    }
  }, [scrollPosition, phase])

  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex items-center justify-center">

      {/* ▼ フェーズ1：タイトル演出 */}
      {phase === "title" && (
        <div className="flex flex-col items-center text-center animate-title-hold">
         
        </div>
      )}

      {/* ▼ フェーズ2：タイトルは残したままサブタイトルフェード */}
      {phase === "fadeText" && (
        <div className="flex flex-col items-center text-center animate-title-hold">
          <h1 className="text-6xl font-bold text-yellow-400 mb-6 animate-title-zoom-glow"
            style={{ textShadow: "0 0 30px rgba(234,179,8,0.8)" }}>
            天下統一
          </h1>

          <p className="text-2xl text-yellow-200 animate-subtitle-fade">
            三度の勝利により、天下は平定された…
          </p>
        </div>
      )}

      {/* ▼ フェーズ3：スクロール */}
      {phase === "scroll" && (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden">
          <div
            className="absolute w-full text-center px-8 ending-content"
            style={{ top: `${500 - scrollPosition}px` }}
          >
            <div className="max-w-2xl mx-auto">
              {storyText.split("\n").map((line, i) => (
                <p key={i}
                  className={`text-xl mb-4 ${
                    line === "【 完 】" ? "text-3xl text-yellow-400 font-bold mt-12 mb-12"
                    : line.startsWith("━") ? "text-gray-500"
                    : "text-white"
                  }`}
                >
                  {line || "\u00A0"}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ▼ フェーズ4：ボタン */}
      {phase === "button" && (
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white text-xl font-bold rounded-lg animate-fade-in"
          style={{ textShadow: "0 0 10px rgba(0,0,0,0.5)" }}
        >
          新たな戦いへ
        </button>
      )}
    </div>
  )
}
