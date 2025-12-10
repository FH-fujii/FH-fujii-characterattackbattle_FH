// 効果音を生成するユーティリティ
class SoundManager {
  private audioContext: AudioContext | null = null
  private bgmGainNode: GainNode | null = null
  private currentBgmOscillators: OscillatorNode[] = []
  private currentBgmType: "formation" | "battle" | "final" | "ending" | null = null

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    return this.audioContext
  }

  // 剣の効果音
  playSwordSound() {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = "sawtooth"
    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  }

  // バフ効果音
  playBuffSound() {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(400, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  }

  // デバフ効果音
  playDebuffSound() {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = "square"
    oscillator.frequency.setValueAtTime(300, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.25)
  }

  // 選択効果音
  playSelectSound() {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(600, ctx.currentTime)
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.05)

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  }

  // 選択解除効果音
  playDeselectSound() {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(500, ctx.currentTime)
    oscillator.frequency.setValueAtTime(300, ctx.currentTime + 0.05)

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  }

  playBattleHorn() {
    // 法螺貝の音は削除
  }

  // 旧法螺貝（互換性のため残す）
  playHoragai() {
    // 法螺貝の音は削除
  }

  // 太鼓ドン効果音
  playTaiko() {
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(80, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2)

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  }

  playFormationBgm() {
    if (this.currentBgmType === "formation") return
    this.stopBgm()
    this.currentBgmType = "formation"
    const ctx = this.getContext()
    this.bgmGainNode = ctx.createGain()
    this.bgmGainNode.gain.value = 0.06
    this.bgmGainNode.connect(ctx.destination)

    const playLoop = () => {
      // 和風ペンタトニック（ヨナ抜き音階: ド、レ、ミ、ソ、ラ）
      const notes = [262, 294, 330, 392, 440, 392, 330, 294]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(this.bgmGainNode!)

        osc.type = "sine"
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.4)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.4 + 0.35)

        osc.start(ctx.currentTime + i * 0.4)
        osc.stop(ctx.currentTime + i * 0.4 + 0.4)
        this.currentBgmOscillators.push(osc)
      })
    }

    playLoop()
    const interval = setInterval(playLoop, 3200)
    ;(this as any).bgmInterval = interval
  }

  playBattleBgm() {
    if (this.currentBgmType === "battle") return
    this.stopBgm()
    this.currentBgmType = "battle"
    const ctx = this.getContext()
    this.bgmGainNode = ctx.createGain()
    this.bgmGainNode.gain.value = 0.05
    this.bgmGainNode.connect(ctx.destination)

    const playLoop = () => {
      // 和風戦闘音楽（短い音符で緊張感、民謡風）
      const pattern = [196, 220, 262, 294, 330, 294, 262, 220]
      pattern.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(this.bgmGainNode!)

        osc.type = "triangle"
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.2)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.18)

        osc.start(ctx.currentTime + i * 0.2)
        osc.stop(ctx.currentTime + i * 0.2 + 0.2)
        this.currentBgmOscillators.push(osc)
      })
    }

    playLoop()
    const interval = setInterval(playLoop, 1600)
    ;(this as any).bgmInterval = interval
  }

  playFinalBgm() {
    if (this.currentBgmType === "final") return
    this.stopBgm()
    this.currentBgmType = "final"
    const ctx = this.getContext()
    this.bgmGainNode = ctx.createGain()
    this.bgmGainNode.gain.value = 0.06
    this.bgmGainNode.connect(ctx.destination)

    const playLoop = () => {
      // 緊迫感のある和風音階（短調風）
      const pattern = [196, 233, 262, 311, 330, 311, 262, 233]
      pattern.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(this.bgmGainNode!)

        osc.type = "sawtooth"
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.13)

        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + i * 0.15 + 0.15)
        this.currentBgmOscillators.push(osc)
      })
    }

    playLoop()
    const interval = setInterval(playLoop, 1200)
    ;(this as any).bgmInterval = interval
  }

  playEndingBgm() {
    if (this.currentBgmType === "ending") return
    this.stopBgm()
    this.currentBgmType = "ending"
    const ctx = this.getContext()
    this.bgmGainNode = ctx.createGain()
    this.bgmGainNode.gain.value = 0.08
    this.bgmGainNode.connect(ctx.destination)

    const playLoop = () => {
      // 荘厳で感動的な和風メロディ（雅楽風）
      const notes = [
        { freq: 262, dur: 0.8 }, // ド
        { freq: 294, dur: 0.4 }, // レ
        { freq: 330, dur: 0.8 }, // ミ
        { freq: 392, dur: 0.6 }, // ソ
        { freq: 440, dur: 1.0 }, // ラ
        { freq: 392, dur: 0.6 }, // ソ
        { freq: 330, dur: 0.8 }, // ミ
        { freq: 294, dur: 0.4 }, // レ
        { freq: 262, dur: 1.2 }, // ド（長め）
      ]

      let time = 0
      notes.forEach(({ freq, dur }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(this.bgmGainNode!)

        osc.type = "sine"
        osc.frequency.value = freq

        // フェードイン・フェードアウトで柔らかく
        gain.gain.setValueAtTime(0, ctx.currentTime + time)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + time + 0.1)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + time + dur - 0.15)
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + time + dur)

        osc.start(ctx.currentTime + time)
        osc.stop(ctx.currentTime + time + dur)
        this.currentBgmOscillators.push(osc)

        time += dur
      })
    }

    playLoop()
    const interval = setInterval(playLoop, 6200)
    ;(this as any).bgmInterval = interval
  }

  stopBgm() {
    this.currentBgmType = null
    if ((this as any).bgmInterval) {
      clearInterval((this as any).bgmInterval)
    }
    this.currentBgmOscillators.forEach((osc) => {
      try {
        osc.stop()
      } catch {}
    })
    this.currentBgmOscillators = []
  }
}

export const soundManager = new SoundManager()
