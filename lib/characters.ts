// キャラクター定義ファイル
export interface CharacterTemplate {
  id: string
  name: string
  title: string
  attack: number
  maxHp: number
  speed: number // 速さを追加
  skillName: string
  skillDescription: string
  skillAnimation: string
  voiceDeploy: string
  voiceDefeat: string
  voiceSkill: string
  emoji: string
  spritePosition: { row: number; col: number }
}

export const ALL_CHARACTERS: CharacterTemplate[] = [
  {
    id: "yukimura",
    name: "幸村",
    title: "紅蓮の",
    attack: 3,
    maxHp: 28,
    speed: 7, // 速さ追加 - 機動力ある武将
    skillName: "自信過剰",
    skillDescription: "ダメージを与えるたび攻撃+2（最大+10）",
    skillAnimation: "fire",
    voiceDeploy: "日ノ本一の兵、\n参る！",
    voiceDefeat: "無念...父上...！",
    voiceSkill: "まだまだ！",
    emoji: "🔥",
    spritePosition: { row: 0, col: 0 },
  },
  {
    id: "kenshin",
    name: "謙信",
    title: "軍神",
    attack: 7,
    maxHp: 22,
    speed: 8, // 軍神は素早い
    skillName: "負けん気",
    skillDescription: "HP0時、一度だけHP1で耐える（後続HP-5）",
    skillAnimation: "lightning",
    voiceDeploy: "毘沙門天の\n加護あり！",
    voiceDefeat: "越後の龍...\nここに散る...",
    voiceSkill: "まだ終わらぬ！",
    emoji: "⚡",
    spritePosition: { row: 0, col: 1 },
  },
  {
    id: "ieyasu",
    name: "家康",
    title: "狸親父",
    attack: 5,
    maxHp: 30,
    speed: 3, // 慎重派なので遅め
    skillName: "堅実家",
    skillDescription: "敵を倒すとHP+12回復",
    skillAnimation: "heal",
    voiceDeploy: "天下泰平のため！",
    voiceDefeat: "鳴かぬなら...\n散るまで...",
    voiceSkill: "腹が減っては\n戦は出来ぬ！",
    emoji: "🐢",
    spritePosition: { row: 0, col: 2 },
  },
  {
    id: "musashi",
    name: "武蔵",
    title: "二天一流の",
    attack: 6,
    maxHp: 18,
    speed: 9, // 剣豪なので最速級
    skillName: "勝てばよかろう",
    skillDescription: "戦闘開始時、前後のキャラの攻撃力+3",
    skillAnimation: "buff",
    voiceDeploy: "二天一流、\n推参！",
    voiceDefeat: "我が剣...\n届かず...",
    voiceSkill: "勝負は勝てば\nよかろうなのだ！",
    emoji: "⚔️",
    spritePosition: { row: 0, col: 3 },
  },
  {
    id: "nobunaga",
    name: "信長",
    title: "第六天魔王",
    attack: 8,
    maxHp: 18,
    speed: 6, // バランス型
    skillName: "二段撃ち",
    skillDescription: "3ターンごとに攻撃が2回発動",
    skillAnimation: "fire",
    voiceDeploy: "天下布武！\n是非もなし！",
    voiceDefeat: "人間五十年...\n夢幻の如くなり...",
    voiceSkill: "撃て！撃て！撃て！",
    emoji: "👹",
    spritePosition: { row: 0, col: 4 },
  },
  {
    id: "hideyoshi",
    name: "秀吉",
    title: "天下人",
    attack: 4,
    maxHp: 26,
    speed: 5, // 策士なので中程度
    skillName: "調略",
    skillDescription: "敵を倒すと次の敵の攻撃力-4",
    skillAnimation: "buff",
    voiceDeploy: "猿知恵と\n侮るでないぞ！",
    voiceDefeat: "露と落ち\n露と消えにし...！",
    voiceSkill: "話を聞こう\nではないか！",
    emoji: "🐵",
    spritePosition: { row: 1, col: 0 },
  },
  {
    id: "masamune",
    name: "政宗",
    title: "独眼竜",
    attack: 10,
    maxHp: 14,
    speed: 8, // 攻撃的なので速い
    skillName: "竜の眼光",
    skillDescription: "HP50%以下で攻撃力が2倍",
    skillAnimation: "lightning",
    voiceDeploy: "伊達の名、\n見せてくれよう！",
    voiceDefeat: "遅く生まれたか...\n無念！",
    voiceSkill: "竜の眼が\n見据えたぞ！",
    emoji: "🐉",
    spritePosition: { row: 1, col: 1 },
  },
  {
    id: "shingen",
    name: "信玄",
    title: "甲斐の虎",
    attack: 5,
    maxHp: 38,
    speed: 4, // 重装なので遅め
    skillName: "不動の構え",
    skillDescription: "HPが半分以下になると発動。受けるダメージを常に-1軽減、かつ相手の攻撃力-2",
    skillAnimation: "counter",
    voiceDeploy: "風林火山！\n動かざること山の如し！",
    voiceDefeat: "甲斐の虎...\nここに眠る...",
    voiceSkill: "この程度か！",
    emoji: "🐯",
    spritePosition: { row: 1, col: 2 },
  },
  {
    id: "mitsuhide",
    name: "光秀",
    title: "謀反人",
    attack: 12,
    maxHp: 10,
    speed: 7, // 奇襲タイプ
    skillName: "謀反の刃",
    skillDescription: "戦闘開始時、味方全員HP-3、自身攻撃+5",
    skillAnimation: "lightning",
    voiceDeploy: "敵は本能寺にあり！",
    voiceDefeat: "三日天下...\nこれも定め...",
    voiceSkill: "時は今\n雨が下しる五月哉！",
    emoji: "🗡️",
    spritePosition: { row: 1, col: 3 },
  },
  {
    id: "hanzo",
    name: "半蔵",
    title: "影の",
    attack: 7,
    maxHp: 20,
    speed: 10, // 忍者なので最速
    skillName: "忍びの術",
    skillDescription: "40%の確率で攻撃を回避",
    skillAnimation: "buff",
    voiceDeploy: "影より来たり、\n影へ還る...",
    voiceDefeat: "忍びの道...\nここに果てる...",
    voiceSkill: "捕まえられるものか！",
    emoji: "🥷",
    spritePosition: { row: 1, col: 4 },
  },
]

export interface DeckStrategy {
  name: string
  description: string
  members: [string, string, string, string, string] // 5人のキャラID
}

export const DECK_STRATEGIES: DeckStrategy[] = [
  {
    name: "速攻殲滅陣",
    description: "高火力で一気に押し切る攻撃特化型",
    members: ["mitsuhide", "nobunaga", "masamune", "yukimura", "kenshin"],
  },
  {
    name: "鉄壁持久陣",
    description: "耐久と回復で長期戦を制する防御型",
    members: ["shingen", "ieyasu", "hideyoshi", "hanzo", "kenshin"],
  },
  {
    name: "連携強化陣",
    description: "バフを重ねて後半に爆発する連携型",
    members: ["musashi", "yukimura", "nobunaga", "masamune", "kenshin"],
  },
  {
    name: "影武者奇襲陣",
    description: "回避と奇襲で翻弄するトリッキー型",
    members: ["hanzo", "mitsuhide", "musashi", "masamune", "shingen"],
  },
  {
    name: "天下統一陣",
    description: "バランス重視の万能型編成",
    members: ["nobunaga", "ieyasu", "musashi", "hideyoshi", "shingen"],
  },
]

// バトル用のキャラクター状態
export interface BattleCharacter {
  template: CharacterTemplate
  currentHp: number
  currentAttack: number
  attackBonus: number // スナイパー幸村用
  hasUsedLastStand: boolean // 謙信用
  turnCount: number // 信長用
  isDefeated: boolean
}

export function createBattleCharacter(template: CharacterTemplate): BattleCharacter {
  return {
    template,
    currentHp: template.maxHp,
    currentAttack: template.attack,
    attackBonus: 0,
    hasUsedLastStand: false,
    turnCount: 0,
    isDefeated: false,
  }
}
