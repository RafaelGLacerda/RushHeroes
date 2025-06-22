"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, Sword, Shield, Package, User, Trophy, Skull, Clock, Zap, Plus } from "lucide-react"

// Types
interface Mob {
  id: string
  name: string
  stars: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  role: "DPS" | "Tank" | "Support"
  level: number
  exp: number
  maxHp: number
  currentHp: number
  atk: number
  def: number
  spd: number
  skills: Skill[]
  equipment: Equipment[]
  image: string
  isAlive: boolean
  buffs: Buff[]
  debuffs: Debuff[]
  animation: string
  baseName: string // For evolution tracking
}

interface Skill {
  id: string
  name: string
  type: "basic" | "special" | "ultimate"
  cooldown: number
  currentCooldown: number
  description: string
  effect: SkillEffect
  damageMultiplier: number
  targetType: "single" | "all" | "self" | "ally"
}

interface SkillEffect {
  type: "damage" | "heal" | "buff" | "debuff" | "special"
  value: number
  duration?: number
  stat?: string
}

interface Buff {
  name: string
  stat: string
  value: number
  duration: number
}

interface Debuff {
  name: string
  stat: string
  value: number
  duration: number
}

interface Equipment {
  id: string
  type: "helmet" | "chest" | "pants" | "boots"
  rarity: "blue" | "purple" | "orange"
  level: number
  mainStat: string
  mainValue: number
  subStats: { stat: string; value: number }[]
}

interface CampaignStage {
  chapter: number
  stage: number
  name: string
  difficulty: number
  enemies: number
  rewards: {
    exp: number
    diamonds: number
    tickets?: number
  }
  unlocked: boolean
  completed: boolean
  stars: number
}

interface TowerFloor {
  floor: number
  name: string
  difficulty: number
  enemies: number
  rewards: {
    exp: number
    diamonds: number
    tickets?: number
  }
  completed: boolean
}

interface AFKRewards {
  exp: number
  diamonds: number
  mobExp: number
  lastClaimed: number
  rate: number // per minute
}

interface Player {
  nickname: string
  id: string
  level: number
  exp: number
  diamonds: number
  tickets: number
  mobs: Mob[]
  campaignProgress: {
    currentChapter: number
    currentStage: number
    stages: CampaignStage[]
  }
  towerProgress: {
    currentFloor: number
    floors: TowerFloor[]
  }
  afkRewards: AFKRewards
  lastOnline: number
}

interface BattleState {
  playerTeam: Mob[]
  enemyTeam: Mob[]
  turnOrder: (Mob & { isPlayer: boolean })[]
  currentTurn: number
  battleLog: string[]
  isPlayerTurn: boolean
  battleResult: "ongoing" | "victory" | "defeat"
  isAnimating: boolean
  selectedTarget: string | null
  selectedSkill: Skill | null
  battleType: "campaign" | "tower"
  stageInfo?: CampaignStage | TowerFloor
}

// Enhanced Game Data with proper skills
const SKILLS_DATABASE = {
  // DPS Skills
  DPS_BASIC: {
    id: "dps_basic",
    name: "Strike",
    type: "basic" as const,
    cooldown: 0,
    currentCooldown: 0,
    description: "Basic physical attack",
    effect: { type: "damage" as const, value: 100 },
    damageMultiplier: 1.0,
    targetType: "single" as const,
  },
  DPS_SPECIAL: {
    id: "dps_special",
    name: "Power Slash",
    type: "special" as const,
    cooldown: 3,
    currentCooldown: 0,
    description: "Powerful attack with 150% damage",
    effect: { type: "damage" as const, value: 150 },
    damageMultiplier: 1.5,
    targetType: "single" as const,
  },
  DPS_ULTIMATE: {
    id: "dps_ultimate",
    name: "Berserker Rage",
    type: "ultimate" as const,
    cooldown: 5,
    currentCooldown: 0,
    description: "Devastating attack to all enemies",
    effect: { type: "damage" as const, value: 200 },
    damageMultiplier: 2.0,
    targetType: "all" as const,
  },

  // Tank Skills
  TANK_BASIC: {
    id: "tank_basic",
    name: "Shield Bash",
    type: "basic" as const,
    cooldown: 0,
    currentCooldown: 0,
    description: "Basic attack with taunt",
    effect: { type: "damage" as const, value: 80 },
    damageMultiplier: 0.8,
    targetType: "single" as const,
  },
  TANK_SPECIAL: {
    id: "tank_special",
    name: "Fortress",
    type: "special" as const,
    cooldown: 4,
    currentCooldown: 0,
    description: "Increase defense by 50% for 3 turns",
    effect: { type: "buff" as const, value: 50, duration: 3, stat: "def" },
    damageMultiplier: 0,
    targetType: "self" as const,
  },
  TANK_ULTIMATE: {
    id: "tank_ultimate",
    name: "Guardian's Wrath",
    type: "ultimate" as const,
    cooldown: 6,
    currentCooldown: 0,
    description: "Massive damage and stun all enemies",
    effect: { type: "special" as const, value: 180 },
    damageMultiplier: 1.8,
    targetType: "all" as const,
  },

  // Support Skills
  SUPPORT_BASIC: {
    id: "support_basic",
    name: "Heal",
    type: "basic" as const,
    cooldown: 0,
    currentCooldown: 0,
    description: "Restore HP to ally",
    effect: { type: "heal" as const, value: 150 },
    damageMultiplier: 0,
    targetType: "ally" as const,
  },
  SUPPORT_SPECIAL: {
    id: "support_special",
    name: "Blessing",
    type: "special" as const,
    cooldown: 3,
    currentCooldown: 0,
    description: "Increase all allies' attack by 30%",
    effect: { type: "buff" as const, value: 30, duration: 3, stat: "atk" },
    damageMultiplier: 0,
    targetType: "all" as const,
  },
  SUPPORT_ULTIMATE: {
    id: "support_ultimate",
    name: "Divine Light",
    type: "ultimate" as const,
    cooldown: 7,
    currentCooldown: 0,
    description: "Heal all allies and remove debuffs",
    effect: { type: "heal" as const, value: 300 },
    damageMultiplier: 0,
    targetType: "all" as const,
  },
}

const MOB_POOL: Omit<
  Mob,
  "id" | "level" | "exp" | "equipment" | "currentHp" | "isAlive" | "buffs" | "debuffs" | "animation" | "baseName"
>[] = [
  // 3 Stars (70% - 10 mobs)
  { name: "Fire Wolf", stars: 3, role: "DPS", maxHp: 800, atk: 120, def: 80, spd: 95, skills: [], image: "🐺" },
  { name: "Water Slime", stars: 3, role: "Tank", maxHp: 1200, atk: 80, def: 150, spd: 70, skills: [], image: "💧" },
  { name: "Earth Golem", stars: 3, role: "Tank", maxHp: 1100, atk: 90, def: 140, spd: 65, skills: [], image: "🗿" },
  { name: "Wind Fairy", stars: 3, role: "Support", maxHp: 700, atk: 100, def: 90, spd: 110, skills: [], image: "🧚" },
  { name: "Fire Imp", stars: 3, role: "DPS", maxHp: 750, atk: 130, def: 70, spd: 100, skills: [], image: "👹" },
  { name: "Water Turtle", stars: 3, role: "Tank", maxHp: 1300, atk: 70, def: 160, spd: 60, skills: [], image: "🐢" },
  { name: "Earth Bear", stars: 3, role: "DPS", maxHp: 900, atk: 125, def: 100, spd: 85, skills: [], image: "🐻" },
  { name: "Wind Bird", stars: 3, role: "DPS", maxHp: 650, atk: 140, def: 60, spd: 120, skills: [], image: "🐦" },
  { name: "Fire Lizard", stars: 3, role: "DPS", maxHp: 800, atk: 135, def: 75, spd: 90, skills: [], image: "🦎" },
  { name: "Water Crab", stars: 3, role: "Support", maxHp: 850, atk: 85, def: 120, spd: 80, skills: [], image: "🦀" },

  // 4 Stars (25% - 7 mobs)
  { name: "Fire Dragon", stars: 4, role: "DPS", maxHp: 1000, atk: 180, def: 100, spd: 105, skills: [], image: "🐲" },
  {
    name: "Water Phoenix",
    stars: 4,
    role: "Support",
    maxHp: 900,
    atk: 140,
    def: 110,
    spd: 115,
    skills: [],
    image: "🔥",
  },
  { name: "Earth Titan", stars: 4, role: "Tank", maxHp: 1600, atk: 120, def: 200, spd: 75, skills: [], image: "⛰️" },
  { name: "Wind Valkyrie", stars: 4, role: "DPS", maxHp: 950, atk: 170, def: 90, spd: 110, skills: [], image: "⚔️" },
  { name: "Fire Demon", stars: 4, role: "DPS", maxHp: 1050, atk: 175, def: 95, spd: 100, skills: [], image: "😈" },
  { name: "Water Angel", stars: 4, role: "Support", maxHp: 850, atk: 130, def: 120, spd: 120, skills: [], image: "👼" },
  { name: "Earth Guardian", stars: 4, role: "Tank", maxHp: 1500, atk: 110, def: 190, spd: 80, skills: [], image: "🛡️" },

  // 5 Stars (5% - 3 mobs)
  { name: "Inferno King", stars: 5, role: "DPS", maxHp: 1200, atk: 250, def: 120, spd: 125, skills: [], image: "👑" },
  {
    name: "Ocean Empress",
    stars: 5,
    role: "Support",
    maxHp: 1100,
    atk: 180,
    def: 150,
    spd: 135,
    skills: [],
    image: "🌊",
  },
  { name: "Mountain Lord", stars: 5, role: "Tank", maxHp: 2000, atk: 150, def: 250, spd: 90, skills: [], image: "🏔️" },
]

export default function SummonersWarGame() {
  const [gameState, setGameState] = useState<
    "nickname" | "main" | "gacha" | "inventory" | "battle" | "profile" | "shop" | "campaign" | "tower" | "afk" | "evolution"
  >("nickname")
  const [player, setPlayer] = useState<Player | null>(null)
  const [nickname, setNickname] = useState("")
  const [battleState, setBattleState] = useState<BattleState | null>(null)
  const [selectedMobs, setSelectedMobs] = useState<string[]>([])
  const [showGachaResult, setShowGachaResult] = useState<Mob[] | null>(null)
  const [showLevelUp, setShowLevelUp] = useState<{ type: "player" | "mob"; data: any } | null>(null)
  const [afkTime, setAfkTime] = useState(0)
  const [selectedStage, setSelectedStage] = useState<CampaignStage | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<TowerFloor | null>(null)
  const [evolutionMob, setEvolutionMob] = useState<Mob | null>(null)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [inventoryFilter, setInventoryFilter] = useState<"level-asc" | "level-desc" | "stars-asc" | "stars-desc" | "none">("none")
  const [selectedMobForLevelUp, setSelectedMobForLevelUp] = useState<Mob | null>(null)

  // Load game data on mount
  useEffect(() => {
    const savedPlayer = localStorage.getItem("summoners-war-player")
    if (savedPlayer) {
      const loadedPlayer = JSON.parse(savedPlayer)
      // Calculate AFK rewards
      const now = Date.now()
      const timeDiff = now - (loadedPlayer.lastOnline || now)
      const minutesOffline = Math.floor(timeDiff / (1000 * 60))

      if (minutesOffline > 0) {
        const afkRewards = calculateAFKRewards(loadedPlayer, minutesOffline)
        loadedPlayer.afkRewards = afkRewards
        setAfkTime(minutesOffline)
      }

      setPlayer(loadedPlayer)
      setGameState("main")
    }
  }, [])

  // Save game data whenever player changes
  useEffect(() => {
    if (player) {
      const playerToSave = { ...player, lastOnline: Date.now() }
      localStorage.setItem("summoners-war-player", JSON.stringify(playerToSave))
    }
  }, [player])

  // AFK Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (player && gameState === "afk") {
        setPlayer((prev) => {
          if (!prev) return null
          const newAfkRewards = { ...prev.afkRewards }
          newAfkRewards.exp += newAfkRewards.rate
          newAfkRewards.diamonds += Math.floor(newAfkRewards.rate / 10)
          newAfkRewards.mobExp += Math.floor(newAfkRewards.rate / 2)
          return { ...prev, afkRewards: newAfkRewards }
        })
      }
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [player, gameState])

  const calculateAFKRewards = (player: Player, minutes: number) => {
    const baseRate = Math.max(2, Math.floor(player.level / 5)) // Aumentar taxa base
    const totalExp = baseRate * minutes
    const totalDiamonds = Math.floor(totalExp / 5) // Mais diamantes
    const totalMobExp = Math.floor(totalExp / 1.5) // Mais mob exp

    return {
      exp: totalExp,
      diamonds: totalDiamonds,
      mobExp: totalMobExp,
      lastClaimed: Date.now(),
      rate: baseRate,
    }
  }

  const generateCampaignStages = (): CampaignStage[] => {
    const stages: CampaignStage[] = []

    for (let chapter = 1; chapter <= 10; chapter++) {
      const stagesInChapter = chapter <= 5 ? 10 : 18

      for (let stage = 1; stage <= stagesInChapter; stage++) {
        const stageNumber = stages.length + 1
        const difficulty = Math.floor(stageNumber / 5) + 1

        stages.push({
          chapter,
          stage,
          name: `Chapter ${chapter}-${stage}`,
          difficulty,
          enemies: Math.min(2 + Math.floor(stageNumber / 10), 4),
          rewards: {
            exp: 50 + stageNumber * 10,
            diamonds: 10 + Math.floor(stageNumber / 5),
            tickets: stage === stagesInChapter ? 2 : stage % 5 === 0 ? 1 : undefined, // More tickets
          },
          unlocked: stageNumber === 1,
          completed: false,
          stars: 0,
        })
      }
    }

    return stages
  }

  const generateTowerFloors = (): TowerFloor[] => {
    const floors: TowerFloor[] = []

    for (let floor = 1; floor <= 1000; floor++) {
      const difficulty = Math.floor(floor / 10) + 1

      floors.push({
        floor,
        name: `Floor ${floor}`,
        difficulty,
        enemies: Math.min(1 + Math.floor(floor / 50), 5),
        rewards: {
          exp: 100 + floor * 5,
          diamonds: 20 + Math.floor(floor / 10),
          tickets: floor % 5 === 0 ? Math.floor(floor / 5) + 1 : undefined, // More tickets
        },
        completed: false,
      })
    }

    return floors
  }

  const createPlayer = () => {
    if (!nickname.trim() || !/^[a-zA-Z0-9_]+$/.test(nickname)) {
      alert("Nickname deve conter apenas caracteres alfanuméricos e underscore!")
      return
    }

    const campaignStages = generateCampaignStages()
    const towerFloors = generateTowerFloors()

    const newPlayer: Player = {
      nickname: nickname.trim(),
      id: `${nickname.trim()}_${Date.now()}`,
      level: 1,
      exp: 0,
      diamonds: 1000,
      tickets: 50, // More starting tickets
      mobs: [],
      campaignProgress: {
        currentChapter: 1,
        currentStage: 1,
        stages: campaignStages,
      },
      towerProgress: {
        currentFloor: 1,
        floors: towerFloors,
      },
      afkRewards: {
        exp: 0,
        diamonds: 0,
        mobExp: 0,
        lastClaimed: Date.now(),
        rate: 1,
      },
      lastOnline: Date.now(),
    }

    setPlayer(newPlayer)
    setGameState("main")
  }

  const getSkillsForRole = (role: "DPS" | "Tank" | "Support"): Skill[] => {
    switch (role) {
      case "DPS":
        return [
          { ...SKILLS_DATABASE.DPS_BASIC },
          { ...SKILLS_DATABASE.DPS_SPECIAL },
          { ...SKILLS_DATABASE.DPS_ULTIMATE },
        ]
      case "Tank":
        return [
          { ...SKILLS_DATABASE.TANK_BASIC },
          { ...SKILLS_DATABASE.TANK_SPECIAL },
          { ...SKILLS_DATABASE.TANK_ULTIMATE },
        ]
      case "Support":
        return [
          { ...SKILLS_DATABASE.SUPPORT_BASIC },
          { ...SKILLS_DATABASE.SUPPORT_SPECIAL },
          { ...SKILLS_DATABASE.SUPPORT_ULTIMATE },
        ]
    }
  }

  const calculateMobStats = (baseMob: Mob, level: number): Mob => {
    const levelMultiplier = 1 + (level - 1) * 0.1
    const starMultiplier = 1 + (baseMob.stars - 3) * 0.3 // Higher stars = better stats
    const totalMultiplier = levelMultiplier * starMultiplier

    return {
      ...baseMob,
      level,
      maxHp: Math.floor(baseMob.maxHp * totalMultiplier),
      currentHp: Math.floor(baseMob.maxHp * totalMultiplier),
      atk: Math.floor(baseMob.atk * totalMultiplier),
      def: Math.floor(baseMob.def * totalMultiplier),
      spd: Math.floor(baseMob.spd * totalMultiplier),
    }
  }

  const generateMob = (mobData: (typeof MOB_POOL)[0], level = 1): Mob => {
    const skills = getSkillsForRole(mobData.role)

    const mob: Mob = {
      ...mobData,
      id: `${mobData.name}_${Date.now()}_${Math.random()}`,
      level,
      exp: 0,
      currentHp: mobData.maxHp,
      skills,
      equipment: [],
      isAlive: true,
      buffs: [],
      debuffs: [],
      animation: "",
      baseName: mobData.name,
    }

    return calculateMobStats(mob, level)
  }

  const levelUpMob = (mobId: string, expGain: number) => {
    setPlayer((prev) => {
      if (!prev) return null

      const newMobs = prev.mobs.map((mob) => {
        if (mob.id === mobId) {
          const newExp = mob.exp + expGain
          const expNeeded = mob.level * 100

          if (newExp >= expNeeded) {
            const newLevel = mob.level + 1
            const updatedMob = calculateMobStats({ ...mob, level: newLevel, exp: newExp - expNeeded }, newLevel)

            setShowLevelUp({ type: "mob", data: { ...updatedMob, oldLevel: mob.level } })
            return updatedMob
          }

          return { ...mob, exp: newExp }
        }
        return mob
      })

      return { ...prev, mobs: newMobs }
    })
  }

  const levelUpPlayer = (expGain: number) => {
    setPlayer((prev) => {
      if (!prev) return null

      const newExp = prev.exp + expGain
      const expNeeded = prev.level * 1000

      if (newExp >= expNeeded) {
        const newLevel = prev.level + 1
        setShowLevelUp({ type: "player", data: { level: newLevel, oldLevel: prev.level } })

        return {
          ...prev,
          level: newLevel,
          exp: newExp - expNeeded,
          afkRewards: {
            ...prev.afkRewards,
            rate: Math.max(1, Math.floor(newLevel / 10)),
          },
        }
      }

      return { ...prev, exp: newExp }
    })
  }

  const performGacha = (count = 1) => {
    if (!player || player.tickets < count) return

    const results: Mob[] = []

    for (let i = 0; i < count; i++) {
      const rand = Math.random()
      let selectedMob: (typeof MOB_POOL)[0]

      if (rand < 0.05) {
        const fiveStars = MOB_POOL.filter((m) => m.stars === 5)
        selectedMob = fiveStars[Math.floor(Math.random() * fiveStars.length)]
      } else if (rand < 0.3) {
        const fourStars = MOB_POOL.filter((m) => m.stars === 4)
        selectedMob = fourStars[Math.floor(Math.random() * fourStars.length)]
      } else {
        const threeStars = MOB_POOL.filter((m) => m.stars === 3)
        selectedMob = threeStars[Math.floor(Math.random() * threeStars.length)]
      }

      const newMob = generateMob(selectedMob)
      results.push(newMob)
    }

    setPlayer((prev) =>
      prev
        ? {
            ...prev,
            tickets: prev.tickets - count,
            mobs: [...prev.mobs, ...results],
          }
        : null,
    )

    setShowGachaResult(results)
  }

  const evolveMob = () => {
    if (!evolutionMob || !player || selectedMaterials.length === 0) return

    const requiredMaterials = evolutionMob.stars - 2 // 3* needs 1, 4* needs 2, etc.
    if (selectedMaterials.length < requiredMaterials) return

    // Remove materials and evolve mob
    setPlayer((prev) => {
      if (!prev) return null

      const newMobs = prev.mobs.filter((mob) => !selectedMaterials.includes(mob.id) && mob.id !== evolutionMob.id)

      const evolvedMob: Mob = {
        ...evolutionMob,
        stars: (evolutionMob.stars + 1) as any,
        name: `${evolutionMob.baseName} ⭐${evolutionMob.stars + 1}`,
      }

      const recalculatedMob = calculateMobStats(evolvedMob, evolvedMob.level)

      return {
        ...prev,
        mobs: [...newMobs, recalculatedMob],
      }
    })

    setEvolutionMob(null)
    setSelectedMaterials([])
    setGameState("inventory")
  }

  const calculateDamage = (attacker: Mob, target: Mob, skill: Skill): number => {
    const baseAttack = attacker.atk
    const defense = target.def
    const skillMultiplier = skill.damageMultiplier

    // Apply buffs/debuffs
    const attackBuff = attacker.buffs.find((b) => b.stat === "atk")
    const defenseDebuff = target.debuffs.find((d) => d.stat === "def")

    const finalAttack = baseAttack * (1 + (attackBuff?.value || 0) / 100)
    const finalDefense = defense * (1 - (defenseDebuff?.value || 0) / 100)

    const damage = Math.max(1, Math.floor(finalAttack * skillMultiplier - finalDefense * 0.5))
    return damage + Math.floor(Math.random() * 20) - 10 // Add some randomness
  }

  const applySkillEffect = (caster: Mob, target: Mob, skill: Skill, isPlayer: boolean) => {
    const effect = skill.effect
    let damage = 0
    let healing = 0

    switch (effect.type) {
      case "damage":
        damage = calculateDamage(caster, target, skill)
        target.currentHp = Math.max(0, target.currentHp - damage)
        if (target.currentHp === 0) target.isAlive = false
        break

      case "heal":
        healing = effect.value + Math.floor(caster.atk * 0.3)
        target.currentHp = Math.min(target.maxHp, target.currentHp + healing)
        break

      case "buff":
        if (effect.stat && effect.duration) {
          target.buffs.push({
            name: skill.name,
            stat: effect.stat,
            value: effect.value,
            duration: effect.duration,
          })
        }
        break

      case "debuff":
        if (effect.stat && effect.duration) {
          target.debuffs.push({
            name: skill.name,
            stat: effect.stat,
            value: effect.value,
            duration: effect.duration,
          })
        }
        break
    }

    return { damage, healing }
  }

  const executeSkill = useCallback(
    (skill: Skill, targetId?: string) => {
      if (!battleState || battleState.isAnimating) return

      setBattleState((prev) => (prev ? { ...prev, isAnimating: true } : null))

      const currentUnit = battleState.turnOrder[battleState.currentTurn]
      const isPlayerUnit = currentUnit.isPlayer

      // Animation for attacker
      const attackerTeam = isPlayerUnit ? battleState.playerTeam : battleState.enemyTeam
      const attackerIndex = attackerTeam.findIndex((mob) => mob.id === currentUnit.id)

      if (attackerIndex !== -1) {
        attackerTeam[attackerIndex].animation = "attack"
      }

      setTimeout(() => {
        setBattleState((prev) => {
          if (!prev) return null

          const newState = { ...prev }
          const currentUnit = newState.turnOrder[newState.currentTurn]
          const isPlayerUnit = currentUnit.isPlayer

          // Get targets based on skill type
          let targets: Mob[] = []
          if (skill.targetType === "single") {
            if (targetId) {
              const target = [...newState.playerTeam, ...newState.enemyTeam].find((mob) => mob.id === targetId)
              if (target) targets = [target]
            } else {
              // AI targeting logic
              const enemyTeam = isPlayerUnit ? newState.enemyTeam : newState.playerTeam
              targets = [enemyTeam.filter((mob) => mob.isAlive)[0]].filter(Boolean)
            }
          } else if (skill.targetType === "all") {
            if (skill.effect.type === "heal" || skill.effect.type === "buff") {
              targets = isPlayerUnit
                ? newState.playerTeam.filter((mob) => mob.isAlive)
                : newState.enemyTeam.filter((mob) => mob.isAlive)
            } else {
              targets = isPlayerUnit
                ? newState.enemyTeam.filter((mob) => mob.isAlive)
                : newState.playerTeam.filter((mob) => mob.isAlive)
            }
          } else if (skill.targetType === "self") {
            targets = [currentUnit]
          } else if (skill.targetType === "ally") {
            const allyTeam = isPlayerUnit ? newState.playerTeam : newState.enemyTeam
            targets = [allyTeam.filter((mob) => mob.isAlive && mob.currentHp < mob.maxHp)[0]].filter(Boolean)
          }

          // Apply skill effects
          let totalDamage = 0
          let totalHealing = 0

          targets.forEach((target) => {
            const result = applySkillEffect(currentUnit, target, skill, isPlayerUnit)
            totalDamage += result.damage
            totalHealing += result.healing

            // Add hit animation to target
            const targetTeam = newState.playerTeam.find((mob) => mob.id === target.id)
              ? newState.playerTeam
              : newState.enemyTeam
            const targetIndex = targetTeam.findIndex((mob) => mob.id === target.id)
            if (targetIndex !== -1) {
              targetTeam[targetIndex].animation = result.damage > 0 ? "hit" : "heal"
            }
          })

          // Update cooldowns
          const attackerTeam = isPlayerUnit ? newState.playerTeam : newState.enemyTeam
          const attackerIndex = attackerTeam.findIndex((mob) => mob.id === currentUnit.id)
          if (attackerIndex !== -1) {
            const skillIndex = attackerTeam[attackerIndex].skills.findIndex((s) => s.id === skill.id)
            if (skillIndex !== -1) {
              attackerTeam[attackerIndex].skills[skillIndex].currentCooldown = skill.cooldown
            }
          }

          // Add to battle log
          const logMessage =
            totalDamage > 0
              ? `${currentUnit.name} usou ${skill.name} causando ${totalDamage} de dano!`
              : totalHealing > 0
                ? `${currentUnit.name} usou ${skill.name} curando ${totalHealing} HP!`
                : `${currentUnit.name} usou ${skill.name}!`

          newState.battleLog.push(logMessage)

          // Check battle end
          const playerAlive = newState.playerTeam.some((mob) => mob.isAlive)
          const enemyAlive = newState.enemyTeam.some((mob) => mob.isAlive)

          if (!enemyAlive) {
            newState.battleResult = "victory"
            newState.battleLog.push("Vitória!")
          } else if (!playerAlive) {
            newState.battleResult = "defeat"
            newState.battleLog.push("Derrota!")
          } else {
            // Next turn
            let nextTurn = (newState.currentTurn + 1) % newState.turnOrder.length

            // Skip dead units
            while (!newState.turnOrder[nextTurn].isAlive && newState.battleResult === "ongoing") {
              nextTurn = (nextTurn + 1) % newState.turnOrder.length
            }

            newState.currentTurn = nextTurn
            newState.isPlayerTurn = newState.turnOrder[nextTurn]?.isPlayer || false

            // Reduce cooldowns, buff and debuff durations for EVERY mob
            const allMobs = [...newState.playerTeam, ...newState.enemyTeam]
            allMobs.forEach((mob) => {
              // cooldowns
              mob.skills.forEach((s) => {
                if (s.currentCooldown > 0) s.currentCooldown -= 1
              })

              // buff / debuff duration ticks
              mob.buffs.forEach((b) => (b.duration -= 1))
              mob.debuffs.forEach((d) => (d.duration -= 1))
              mob.buffs = mob.buffs.filter((b) => b.duration > 0)
              mob.debuffs = mob.debuffs.filter((d) => d.duration > 0)
            })
          }

          return newState
        })

        // Clear animations after a delay
        setTimeout(() => {
          setBattleState((prev) => {
            if (!prev) return null
            const newState = { ...prev }

            // Clear all animations
            const allMobs = [...newState.playerTeam, ...newState.enemyTeam]
            allMobs.forEach((mob) => {
              mob.animation = ""
            })

            newState.isAnimating = false
            newState.selectedTarget = null
            newState.selectedSkill = null

            return newState
          })
        }, 1000)
      }, 500)
    },
    [battleState],
  )

  const startBattle = (stageInfo: CampaignStage | TowerFloor, battleType: "campaign" | "tower") => {
    if (!player || selectedMobs.length === 0) return

    const playerTeam = player.mobs
      .filter((mob) => selectedMobs.includes(mob.id))
      .slice(0, 4)
      .map((mob) => ({
        ...mob,
        currentHp: mob.maxHp,
        isAlive: true,
        buffs: [],
        debuffs: [],
        animation: "",
        skills: mob.skills.map((skill) => ({ ...skill, currentCooldown: 0 })),
      }))

    // Generate enemies based on stage difficulty
    const enemyTeam: Mob[] = []
    const enemyCount = stageInfo.enemies
    const enemyLevel = Math.max(1, stageInfo.difficulty * 2)

    for (let i = 0; i < enemyCount; i++) {
      const randomMob = MOB_POOL[Math.floor(Math.random() * MOB_POOL.length)]
      enemyTeam.push(generateMob(randomMob, enemyLevel))
    }

    const allUnits = [
      ...playerTeam.map((mob) => ({ ...mob, isPlayer: true })),
      ...enemyTeam.map((mob) => ({ ...mob, isPlayer: false })),
    ].sort((a, b) => b.spd - a.spd)

    setBattleState({
      playerTeam,
      enemyTeam,
      turnOrder: allUnits,
      currentTurn: 0,
      battleLog: ["Batalha iniciada!"],
      isPlayerTurn: allUnits[0]?.isPlayer || false,
      battleResult: "ongoing",
      isAnimating: false,
      selectedTarget: null,
      selectedSkill: null,
      battleType,
      stageInfo,
    })

    setGameState("battle")
  }

  const completeBattle = (victory: boolean) => {
    if (!battleState || !battleState.stageInfo || !player) return

    if (victory) {
      const rewards = battleState.stageInfo.rewards

      // Give rewards
      levelUpPlayer(rewards.exp)
      setPlayer((prev) => {
        if (!prev) return null

        const newPlayer = {
          ...prev,
          diamonds: prev.diamonds + rewards.diamonds,
          tickets: prev.tickets + (rewards.tickets || 0),
        }

        // Give mob exp to team
        const mobExpPerMob = Math.floor(rewards.exp / 4)
        newPlayer.mobs = newPlayer.mobs.map((mob) => {
          if (selectedMobs.includes(mob.id)) {
            const newExp = mob.exp + mobExpPerMob
            const expNeeded = mob.level * 100

            if (newExp >= expNeeded) {
              const newLevel = mob.level + 1
              return calculateMobStats({ ...mob, level: newLevel, exp: newExp - expNeeded }, newLevel)
            }

            return { ...mob, exp: newExp }
          }
          return mob
        })

        // Update campaign/tower progress
        if (battleState.battleType === "campaign") {
          const stageInfo = battleState.stageInfo as CampaignStage
          const stageIndex = newPlayer.campaignProgress.stages.findIndex(
            (s) => s.chapter === stageInfo.chapter && s.stage === stageInfo.stage,
          )

          if (stageIndex !== -1) {
            newPlayer.campaignProgress.stages[stageIndex].completed = true
            newPlayer.campaignProgress.stages[stageIndex].stars = 3 // Always 3 stars for now

            // Unlock next stage
            if (stageIndex + 1 < newPlayer.campaignProgress.stages.length) {
              newPlayer.campaignProgress.stages[stageIndex + 1].unlocked = true
            }
          }
        } else if (battleState.battleType === "tower") {
          const floorInfo = battleState.stageInfo as TowerFloor
          const floorIndex = newPlayer.towerProgress.floors.findIndex((f) => f.floor === floorInfo.floor)

          if (floorIndex !== -1) {
            newPlayer.towerProgress.floors[floorIndex].completed = true
            newPlayer.towerProgress.currentFloor = Math.max(newPlayer.towerProgress.currentFloor, floorInfo.floor + 1)
          }
        }

        return newPlayer
      })
    }

    setBattleState(null)
    setSelectedMobs([])
    setSelectedStage(null)
    setSelectedFloor(null)
    setGameState(battleState.battleType === "campaign" ? "campaign" : "tower")
  }

  const levelUpMobManually = (mobId: string, expToAdd: number) => {
    if (!player || player.diamonds < Math.floor(expToAdd / 10)) return

    setPlayer((prev) => {
      if (!prev) return null

      const cost = Math.floor(expToAdd / 10)
      const newMobs = prev.mobs.map((mob) => {
        if (mob.id === mobId) {
          let newExp = mob.exp + expToAdd
          let newLevel = mob.level
          let expNeeded = newLevel * 100

          // Level up loop
          while (newExp >= expNeeded) {
            newExp -= expNeeded
            newLevel += 1
            expNeeded = newLevel * 100
          }

          const updatedMob = calculateMobStats({ ...mob, level: newLevel, exp: newExp }, newLevel)
        
          if (newLevel > mob.level) {
            setShowLevelUp({ type: "mob", data: { ...updatedMob, oldLevel: mob.level } })
          }
        
          return updatedMob
        }
        return mob
      })

      return { 
        ...prev, 
        mobs: newMobs,
        diamonds: prev.diamonds - cost
      }
    })
  }

  // AI Turn Logic
  useEffect(() => {
    if (
      battleState &&
      !battleState.isPlayerTurn &&
      battleState.battleResult === "ongoing" &&
      !battleState.isAnimating
    ) {
      const timer = setTimeout(() => {
        const currentUnit = battleState.turnOrder[battleState.currentTurn]
        const availableSkills = currentUnit.skills.filter((skill) => skill.currentCooldown === 0)
        const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)]

        if (randomSkill) {
          executeSkill(randomSkill)
        }
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [battleState, executeSkill])

  const selectSkill = (skill: Skill) => {
    if (!battleState || !battleState.isPlayerTurn || battleState.isAnimating) return

    if (skill.currentCooldown > 0) return

    setBattleState((prev) => (prev ? { ...prev, selectedSkill: skill } : null))

    // If skill doesn't need target selection, execute immediately
    if (skill.targetType === "all" || skill.targetType === "self") {
      executeSkill(skill)
    }
  }

  const selectTarget = (targetId: string) => {
    if (!battleState || !battleState.selectedSkill) return

    executeSkill(battleState.selectedSkill, targetId)
  }

  const claimAFKRewards = () => {
    if (!player) return

    levelUpPlayer(player.afkRewards.exp)

    // Distribute mob exp
    const mobExpPerMob = Math.floor(player.afkRewards.mobExp / Math.max(1, player.mobs.length))
    player.mobs.forEach((mob) => {
      levelUpMob(mob.id, mobExpPerMob)
    })

    setPlayer((prev) => {
      if (!prev) return null
      return {
        ...prev,
        diamonds: prev.diamonds + prev.afkRewards.diamonds,
        afkRewards: {
          ...prev.afkRewards,
          exp: 0,
          diamonds: 0,
          mobExp: 0,
          lastClaimed: Date.now(),
        },
      }
    })
  }

  const getRarityColor = (stars: number) => {
    switch (stars) {
      case 3:
        return "text-blue-500"
      case 4:
        return "text-purple-500"
      case 5:
        return "text-orange-500"
      case 6:
        return "text-red-500"
      case 7:
        return "text-pink-500"
      case 8:
        return "text-cyan-500"
      case 9:
        return "text-yellow-500"
      case 10:
        return "text-rainbow bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent"
      default:
        return "text-gray-500"
    }
  }

  const getRarityBg = (stars: number) => {
    switch (stars) {
      case 3:
        return "bg-blue-100 border-blue-300"
      case 4:
        return "bg-purple-100 border-purple-300"
      case 5:
        return "bg-orange-100 border-orange-300"
      case 6:
        return "bg-red-100 border-red-300"
      case 7:
        return "bg-pink-100 border-pink-300"
      case 8:
        return "bg-cyan-100 border-cyan-300"
      case 9:
        return "bg-yellow-100 border-yellow-300"
      case 10:
        return "bg-gradient-to-r from-red-100 via-yellow-100 to-blue-100 border-rainbow"
      default:
        return "bg-gray-100 border-gray-300"
    }
  }

  // CSS for animations
  const animationStyles = `
    .mob-attack {
      animation: attack 0.5s ease-in-out;
    }
    
    .mob-hit {
      animation: hit 0.5s ease-in-out;
    }
    
    .mob-heal {
      animation: heal 0.5s ease-in-out;
    }
    
    @keyframes attack {
      0% { transform: translateX(0) scale(1); }
      50% { transform: translateX(10px) scale(1.1); }
      100% { transform: translateX(0) scale(1); }
    }
    
    @keyframes hit {
      0% { transform: translateX(0); background-color: transparent; }
      25% { transform: translateX(-5px); background-color: rgba(255, 0, 0, 0.3); }
      50% { transform: translateX(5px); background-color: rgba(255, 0, 0, 0.3); }
      75% { transform: translateX(-3px); background-color: rgba(255, 0, 0, 0.3); }
      100% { transform: translateX(0); background-color: transparent; }
    }
    
    @keyframes heal {
      0% { transform: translateY(0); background-color: transparent; }
      50% { transform: translateY(-10px); background-color: rgba(0, 255, 0, 0.3); }
      100% { transform: translateY(0); background-color: transparent; }
    }
  `

  if (gameState === "nickname") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">⚔️ Rush Heroes</CardTitle>
            <p className="text-muted-foreground">Crie seu nickname para começar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Digite seu nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Apenas letras, números e underscore são permitidos</p>
            <Button onClick={createPlayer} className="w-full" disabled={!nickname.trim()}>
              Começar Jogo
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameState === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/20 rounded-lg p-4 mb-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">⚔️ Rush Heroes</h1>
                <p>Bem-vindo, {player?.nickname}!</p>
                {afkTime > 0 && <p className="text-sm text-yellow-300">Você esteve offline por {afkTime} minutos!</p>}
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-sm opacity-80">Diamantes</p>
                  <p className="font-bold">💎 {player?.diamonds}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Tickets</p>
                  <p className="font-bold">🎫 {player?.tickets}</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Level</p>
                  <p className="font-bold">⭐ {player?.level}</p>
                </div>
              </div>
            </div>

            {/* Player EXP Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span>
                  EXP: {player?.exp}/{(player?.level || 1) * 1000}
                </span>
                <span>{Math.floor(((player?.exp || 0) / ((player?.level || 1) * 1000)) * 100)}%</span>
              </div>
              <Progress value={((player?.exp || 0) / ((player?.level || 1) * 1000)) * 100} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("gacha")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">🎰</div>
                <h3 className="font-bold">Gacha</h3>
                <p className="text-sm text-muted-foreground">Invocar Mobs</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setGameState("inventory")}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">📦</div>
                <h3 className="font-bold">Inventário</h3>
                <p className="text-sm text-muted-foreground">Seus Mobs</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("campaign")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">⚔️</div>
                <h3 className="font-bold">Campanha</h3>
                <p className="text-sm text-muted-foreground">Cap. {player?.campaignProgress.currentChapter}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("tower")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">🗼</div>
                <h3 className="font-bold">Torre</h3>
                <p className="text-sm text-muted-foreground">Andar {player?.towerProgress.currentFloor}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("afk")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">💤</div>
                <h3 className="font-bold">AFK Rewards</h3>
                <p className="text-sm text-muted-foreground">Recursos Idle</p>
                {(player?.afkRewards.exp || 0) > 0 && (
                  <Badge variant="destructive" className="mt-1">
                    !
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("evolution")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">⭐</div>
                <h3 className="font-bold">Evolução</h3>
                <p className="text-sm text-muted-foreground">Upar Estrelas</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("profile")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">👤</div>
                <h3 className="font-bold">Perfil</h3>
                <p className="text-sm text-muted-foreground">Suas Stats</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setGameState("shop")}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">🛒</div>
                <h3 className="font-bold">Loja</h3>
                <p className="text-sm text-muted-foreground">Comprar Itens</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "gacha") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-pink-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">🎰 Gacha</h1>
            <div className="text-right">
              <p>Tickets: 🎫 {player?.tickets}</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Roleta de Invocação</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl">🎰</div>
              <div className="space-y-2">
                <p>
                  <span className="text-orange-500">★★★★★</span> Lendário: 5%
                </p>
                <p>
                  <span className="text-purple-500">★★★★</span> Épico: 25%
                </p>
                <p>
                  <span className="text-blue-500">★★★</span> Raro: 70%
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => performGacha(1)} 
                  disabled={!player || player.tickets < 1} 
                  className="w-full" 
                  size="lg"
                >
                  Invocar 1x (1 Ticket)
                </Button>
                <Button 
                  onClick={() => performGacha(10)} 
                  disabled={!player || player.tickets < 10} 
                  className="w-full" 
                  size="lg"
                  variant="secondary"
                >
                  Invocar 10x (10 Tickets)
                </Button>
              </div>
            </CardContent>
          </Card>

          {player && player.mobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Últimas Invocações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {player.mobs.slice(-6).map((mob) => (
                    <div key={mob.id} className={`p-2 rounded border-2 ${getRarityBg(mob.stars)}`}>
                      <div className="text-2xl text-center">{mob.image}</div>
                      <p className="text-xs text-center font-bold">{mob.name}</p>
                      <p className="text-xs text-center">Lv.{mob.level}</p>
                      <div className="flex justify-center">
                        {Array.from({ length: Math.min(mob.stars, 5) }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${getRarityColor(mob.stars)}`} fill="currentColor" />
                        ))}
                        {mob.stars > 5 && <span className="text-xs font-bold ml-1">+{mob.stars - 5}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Gacha Result Dialog */}
        <Dialog open={!!showGachaResult} onOpenChange={() => setShowGachaResult(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {showGachaResult?.length === 1 ? "Novo Mob Invocado!" : `${showGachaResult?.length} Mobs Invocados!`}
              </DialogTitle>
            </DialogHeader>
            {showGachaResult && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {showGachaResult.map((mob, index) => (
                    <div key={index} className={`p-4 rounded-lg ${getRarityBg(mob.stars)}`}>
                      <div className="text-center space-y-2">
                        <div className="text-4xl">{mob.image}</div>
                        <h3 className="font-bold">{mob.name}</h3>
                        <div className="flex justify-center">
                          {Array.from({ length: Math.min(mob.stars, 5) }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${getRarityColor(mob.stars)}`} fill="currentColor" />
                          ))}
                          {mob.stars > 5 && <span className="text-sm font-bold ml-1">+{mob.stars - 5}</span>}
                        </div>
                        <Badge variant="secondary">{mob.role}</Badge>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>HP: {mob.maxHp}</div>
                          <div>ATK: {mob.atk}</div>
                          <div>DEF: {mob.def}</div>
                          <div>SPD: {mob.spd}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (gameState === "evolution") {
    const availableMobs = player?.mobs.filter(mob => mob.stars < 10) || []
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-900 to-orange-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">⭐ Evolução de Mobs</h1>
            <div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mob Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Selecione o Mob para Evoluir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {availableMobs.map((mob) => (
                    <div
                      key={mob.id}
                      className={`p-2 rounded border-2 cursor-pointer transition-all ${
                        evolutionMob?.id === mob.id
                          ? "border-yellow-500 bg-yellow-100"
                          : `${getRarityBg(mob.stars)} hover:opacity-80`
                      }`}
                      onClick={() => {
                        setEvolutionMob(mob)
                        setSelectedMaterials([])
                      }}
                    >
                      <div className="text-center">
                        <div className="text-2xl">{mob.image}</div>
                        <p className="text-xs font-bold">{mob.name}</p>
                        <p className="text-xs">Lv.{mob.level}</p>
                        <div className="flex justify-center">
                          {Array.from({ length: Math.min(mob.stars, 5) }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${getRarityColor(mob.stars)}`} fill="currentColor" />
                          ))}
                          {mob.stars > 5 && <span className="text-xs font-bold ml-1">+{mob.stars - 5}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Evolution Process */}
            <Card>
              <CardHeader>
                <CardTitle>Processo de Evolução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {evolutionMob ? (
                  <>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-4xl mb-2">{evolutionMob.image}</div>
                      <h3 className="font-bold">{evolutionMob.name}</h3>
                      <div className="flex justify-center items-center gap-2 my-2">
                        <div className="flex">
                          {Array.from({ length: Math.min(evolutionMob.stars, 5) }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${getRarityColor(evolutionMob.stars)}`} fill="currentColor" />
                          ))}
                          {evolutionMob.stars > 5 && <span className="text-sm font-bold ml-1">+{evolutionMob.stars - 5}</span>}
                        </div>
                        <Plus className="w-4 h-4" />
                        <div className="flex">
                          {Array.from({ length: Math.min(evolutionMob.stars + 1, 5) }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${getRarityColor(evolutionMob.stars + 1)}`} fill="currentColor" />
                          ))}
                          {evolutionMob.stars + 1 > 5 && <span className="text-sm font-bold ml-1">+{evolutionMob.stars + 1 - 5}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold">Materiais Necessários:</p>
                      <p className="text-sm text-muted-foreground">
                        {evolutionMob.stars === 3 && "3 mobs de 3 estrelas (mesmo tipo ou cópias)"}
                        {evolutionMob.stars === 4 && "4 mobs de 4 estrelas"}
                        {evolutionMob.stars === 5 && "5 mobs de 5 estrelas"}
                        {evolutionMob.stars === 6 && "6 mobs de 6 estrelas"}
                        {evolutionMob.stars === 7 && "7 mobs de 7 estrelas"}
                        {evolutionMob.stars === 8 && "8 mobs de 8 estrelas"}
                        {evolutionMob.stars === 9 && "9 mobs de 9 estrelas"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Selecionados: {selectedMaterials.length}/{evolutionMob.stars - 2}
                      </p>
                    </div>

                    {/* Material Selection */}
                    <div className="space-y-2">
                      <p className="font-bold">Selecione os Materiais:</p>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {player?.mobs
                          .filter(mob => 
                            mob.id !== evolutionMob.id && 
                            mob.stars === evolutionMob.stars &&
                            (mob.baseName === evolutionMob.baseName || mob.stars >= 4) // Same type for 3*, any for 4*+
                          )
                          .map((mob) => (
                            <div
                              key={mob.id}
                              className={`p-1 rounded border cursor-pointer transition-all ${
                                selectedMaterials.includes(mob.id)
                                  ? "border-red-500 bg-red-100"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                              onClick={() => {
                                if (selectedMaterials.includes(mob.id)) {
                                  setSelectedMaterials(selectedMaterials.filter(id => id !== mob.id))
                                } else if (selectedMaterials.length < evolutionMob.stars - 2) {
                                  setSelectedMaterials([...selectedMaterials, mob.id])
                                }
                              }}
                            >
                              <div className="text-center">
                                <div className="text-lg">{mob.image}</div>
                                <p className="text-xs">{mob.name}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <Button
                      onClick={evolveMob}
                      disabled={selectedMaterials.length < evolutionMob.stars - 2}
                      className="w-full"
                      size="lg"
                    >
                      Evoluir para {evolutionMob.stars + 1} Estrelas
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">⭐</div>
                    <p className="text-muted-foreground">Selecione um mob para evoluir</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Evolution Guide */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Guia de Evolução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong>3★ → 4★:</strong> 3 mobs de 3★ (mesmo tipo ou cópias)</p>
                  <p><strong>4★ → 5★:</strong> 4 mobs de 4★ (qualquer tipo)</p>
                  <p><strong>5★ → 6★:</strong> 5 mobs de 5★ (qualquer tipo)</p>
                  <p><strong>6★ → 7★:</strong> 6 mobs de 6★ (qualquer tipo)</p>
                </div>
                <div className="space-y-2">
                  <p><strong>7★ → 8★:</strong> 7 mobs de 7★ (qualquer tipo)</p>
                  <p><strong>8★ → 9★:</strong> 8 mobs de 8★ (qualquer tipo)</p>
                  <p><strong>9★ → 10★:</strong> 9 mobs de 9★ (qualquer tipo)</p>
                  <p className="text-muted-foreground">Mobs evoluídos ficam muito mais fortes!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "campaign") {
    const currentChapterStages =
      player?.campaignProgress.stages.filter((s) => s.chapter === player.campaignProgress.currentChapter) || []

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-900 to-orange-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">⚔️ Campanha</h1>
            <div className="text-right">
              <p>Capítulo: {player?.campaignProgress.currentChapter}</p>
            </div>
          </div>

          <Tabs defaultValue="stages" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stages">Estágios</TabsTrigger>
              <TabsTrigger value="team">Equipe</TabsTrigger>
            </TabsList>

            <TabsContent value="stages" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {currentChapterStages.map((stage) => (
                  <Card
                    key={`${stage.chapter}-${stage.stage}`}
                    className={`cursor-pointer transition-all ${
                      stage.unlocked
                        ? stage.completed
                          ? "bg-green-100 border-green-300 hover:bg-green-200"
                          : "bg-blue-100 border-blue-300 hover:bg-blue-200"
                        : "bg-gray-100 border-gray-300 opacity-50"
                    }`}
                    onClick={() => {
                      if (stage.unlocked) {
                        setSelectedStage(stage)
                      }
                    }}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{stage.completed ? "✅" : stage.unlocked ? "⚔️" : "🔒"}</div>
                      <h3 className="font-bold text-sm">{stage.stage}</h3>
                      <p className="text-xs text-muted-foreground">Dif: {stage.difficulty}</p>
                      {stage.completed && (
                        <div className="flex justify-center mt-1">
                          {Array.from({ length: stage.stars }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-500" fill="currentColor" />
                          ))}
                        </div>
                      )}
                      <div className="text-xs mt-2 space-y-1">
                        <p>💎 {stage.rewards.diamonds}</p>
                        <p>⭐ {stage.rewards.exp} EXP</p>
                        {stage.rewards.tickets && <p>🎫 {stage.rewards.tickets}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Chapter Navigation */}
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((chapter) => (
                  <Button
                    key={chapter}
                    variant={chapter === player?.campaignProgress.currentChapter ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (player) {
                        setPlayer((prev) =>
                          prev
                            ? {
                                ...prev,
                                campaignProgress: {
                                  ...prev.campaignProgress,
                                  currentChapter: chapter,
                                },
                              }
                            : null,
                        )
                      }
                    }}
                    disabled={chapter > (player?.campaignProgress.currentChapter || 1)}
                  >
                    {chapter}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selecione sua Equipe (máx. 4)</CardTitle>
                </CardHeader>
                <CardContent>
                  {player && player.mobs.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {player.mobs.map((mob) => (
                          <div
                            key={mob.id}
                            className={`p-2 rounded border-2 cursor-pointer transition-all ${
                              selectedMobs.includes(mob.id)
                                ? "border-blue-500 bg-blue-100"
                                : `${getRarityBg(mob.stars)} hover:opacity-80`
                            }`}
                            onClick={() => {
                              if (selectedMobs.includes(mob.id)) {
                                setSelectedMobs(selectedMobs.filter((id) => id !== mob.id))
                              } else if (selectedMobs.length < 4) {
                                setSelectedMobs([...selectedMobs, mob.id])
                              }
                            }}
                          >
                            <div className="text-2xl text-center">{mob.image}</div>
                            <p className="text-xs text-center font-bold">{mob.name}</p>
                            <p className="text-xs text-center">Lv.{mob.level}</p>
                            <div className="flex justify-center">
                              {Array.from({ length: Math.min(mob.stars, 5) }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${getRarityColor(mob.stars)}`} fill="currentColor" />
                              ))}
                              {mob.stars > 5 && <span className="text-xs font-bold ml-1">+{mob.stars - 5}</span>}
                            </div>
                            <Progress value={(mob.exp / (mob.level * 100)) * 100} className="h-1 mt-1" />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Selecionados: {selectedMobs.length}/4</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p>Você precisa de mobs para batalhar!</p>
                      <Button onClick={() => setGameState("gacha")} className="mt-4">
                        Ir para Gacha
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Stage Battle Dialog */}
        <Dialog open={!!selectedStage} onOpenChange={() => setSelectedStage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Batalha</DialogTitle>
            </DialogHeader>
            {selectedStage && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold">{selectedStage.name}</h3>
                  <p className="text-muted-foreground">Dificuldade: {selectedStage.difficulty}</p>
                  <p className="text-muted-foreground">Inimigos: {selectedStage.enemies}</p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold">Recompensas:</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-lg">💎</div>
                      <p className="text-sm">{selectedStage.rewards.diamonds}</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <div className="text-lg">⭐</div>
                      <p className="text-sm">{selectedStage.rewards.exp}</p>
                    </div>
                    {selectedStage.rewards.tickets && (
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-lg">🎫</div>
                        <p className="text-sm">{selectedStage.rewards.tickets}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold">Equipe Selecionada:</p>
                  {selectedMobs.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedMobs.map((mobId) => {
                        const mob = player?.mobs.find(m => m.id === mobId)
                        return mob ? (
                          <div key={mobId} className="text-center p-2 bg-gray-50 rounded">
                            <div className="text-lg">{mob.image}</div>
                            <p className="text-xs">{mob.name}</p>
                            <p className="text-xs">Lv.{mob.level}</p>
                          </div>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">Nenhum mob selecionado</p>
                  )}
                </div>

                <Button
                  onClick={() => {
                    if (selectedMobs.length > 0) {
                      startBattle(selectedStage, "campaign")
                      setSelectedStage(null)
                    }
                  }}
                  disabled={selectedMobs.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Iniciar Batalha
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (gameState === "tower") {
    const currentFloor = player?.towerProgress.floors.find((f) => f.floor === player.towerProgress.currentFloor)
    const availableFloors = player?.towerProgress.floors.slice(0, (player?.towerProgress.currentFloor || 1) + 5) || []

    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">🗼 Torre dos Desafios</h1>
            <div className="text-right">
              <p>Andar Atual: {player?.towerProgress.currentFloor}</p>
            </div>
          </div>

          <Tabs defaultValue="floors" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="floors">Andares</TabsTrigger>
              <TabsTrigger value="team">Equipe</TabsTrigger>
            </TabsList>

            <TabsContent value="floors" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFloors.map((floor) => (
                  <Card
                    key={floor.floor}
                    className={`cursor-pointer transition-all ${
                      floor.floor <= (player?.towerProgress.currentFloor || 1)
                        ? floor.completed
                          ? "bg-green-100 border-green-300 hover:bg-green-200"
                          : "bg-blue-100 border-blue-300 hover:bg-blue-200"
                        : "bg-gray-100 border-gray-300 opacity-50"
                    }`}
                    onClick={() => {
                      if (floor.floor <= (player?.towerProgress.currentFloor || 1)) {
                        setSelectedFloor(floor)
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">
                          {floor.completed
                            ? "✅"
                            : floor.floor <= (player?.towerProgress.currentFloor || 1)
                              ? "🗼"
                              : "🔒"}
                        </div>
                        <div>
                          <h3 className="font-bold">Andar {floor.floor}</h3>
                          <p className="text-sm text-muted-foreground">Dificuldade: {floor.difficulty}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Inimigos:</span>
                          <span>{floor.enemies}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>💎 Diamantes:</span>
                          <span>{floor.rewards.diamonds}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>⭐ EXP:</span>
                          <span>{floor.rewards.exp}</span>
                        </div>
                        {floor.rewards.tickets && (
                          <div className="flex justify-between">
                            <span>🎫 Tickets:</span>
                            <span>{floor.rewards.tickets}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selecione sua Equipe (máx. 4)</CardTitle>
                </CardHeader>
                <CardContent>
                  {player && player.mobs.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {player.mobs.map((mob) => (
                          <div
                            key={mob.id}
                            className={`p-2 rounded border-2 cursor-pointer transition-all ${
                              selectedMobs.includes(mob.id)
                                ? "border-blue-500 bg-blue-100"
                                : `${getRarityBg(mob.stars)} hover:opacity-80`
                            }`}
                            onClick={() => {
                              if (selectedMobs.includes(mob.id)) {
                                setSelectedMobs(selectedMobs.filter((id) => id !== mob.id))
                              } else if (selectedMobs.length < 4) {
                                setSelectedMobs([...selectedMobs, mob.id])
                              }
                            }}
                          >
                            <div className="text-2xl text-center">{mob.image}</div>
                            <p className="text-xs text-center font-bold">{mob.name}</p>
                            <p className="text-xs text-center">Lv.{mob.level}</p>
                            <div className="flex justify-center">
                              {Array.from({ length: Math.min(mob.stars, 5) }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${getRarityColor(mob.stars)}`} fill="currentColor" />
                              ))}
                              {mob.stars > 5 && <span className="text-xs font-bold ml-1">+{mob.stars - 5}</span>}
                            </div>
                            <Progress value={(mob.exp / (mob.level * 100)) * 100} className="h-1 mt-1" />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Selecionados: {selectedMobs.length}/4</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p>Você precisa de mobs para batalhar!</p>
                      <Button onClick={() => setGameState("gacha")} className="mt-4">
                        Ir para Gacha
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Floor Battle Dialog */}
        <Dialog open={!!selectedFloor} onOpenChange={() => setSelectedFloor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desafiar Andar</DialogTitle>
            </DialogHeader>
            {selectedFloor && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold">Andar {selectedFloor.floor}</h3>
                  <p className="text-muted-foreground">Dificuldade: {selectedFloor.difficulty}</p>
                  <p className="text-muted-foreground">Inimigos: {selectedFloor.enemies}</p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold">Recompensas:</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-lg">💎</div>
                      <p className="text-sm">{selectedFloor.rewards.diamonds}</p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <div className="text-lg">⭐</div>
                      <p className="text-sm">{selectedFloor.rewards.exp}</p>
                    </div>
                    {selectedFloor.rewards.tickets && (
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-lg">🎫</div>
                        <p className="text-sm">{selectedFloor.rewards.tickets}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold">Equipe Selecionada:</p>
                  {selectedMobs.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedMobs.map((mobId) => {
                        const mob = player?.mobs.find(m => m.id === mobId)
                        return mob ? (
                          <div key={mobId} className="text-center p-2 bg-gray-50 rounded">
                            <div className="text-lg">{mob.image}</div>
                            <p className="text-xs">{mob.name}</p>
                            <p className="text-xs">Lv.{mob.level}</p>
                          </div>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">Nenhum mob selecionado</p>
                  )}
                </div>

                <Button
                  onClick={() => {
                    if (selectedMobs.length > 0) {
                      startBattle(selectedFloor, "tower")
                      setSelectedFloor(null)
                    }
                  }}
                  disabled={selectedMobs.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Iniciar Batalha
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (gameState === "afk") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-teal-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">💤 AFK Rewards</h1>
            <div className="text-right">
              <p>Taxa: {player?.afkRewards.rate}/min</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recursos Acumulados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded">
                    <div className="text-2xl mb-2">⭐</div>
                    <p className="font-bold">{player?.afkRewards.exp || 0}</p>
                    <p className="text-sm text-muted-foreground">EXP</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded">
                    <div className="text-2xl mb-2">💎</div>
                    <p className="font-bold">{player?.afkRewards.diamonds || 0}</p>
                    <p className="text-sm text-muted-foreground">Diamantes</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded">
                    <div className="text-2xl mb-2">🔥</div>
                    <p className="font-bold">{player?.afkRewards.mobExp || 0}</p>
                    <p className="text-sm text-muted-foreground">Mob EXP</p>
                  </div>
                </div>

                <Button
                  onClick={claimAFKRewards}
                  className="w-full"
                  size="lg"
                  disabled={(player?.afkRewards.exp || 0) === 0}
                >
                  Coletar Recompensas
                </Button>

                <div className="text-sm text-muted-foreground text-center">
                  <p>Última coleta: {new Date(player?.afkRewards.lastClaimed || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Sistema AFK
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Taxa de EXP/min:</span>
                    <span className="font-bold">{player?.afkRewards.rate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taxa de Diamantes/min:</span>
                    <span className="font-bold">{Math.floor((player?.afkRewards.rate || 1) / 10)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taxa de Mob EXP/min:</span>
                    <span className="font-bold">{Math.floor((player?.afkRewards.rate || 1) / 2)}</span>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-bold mb-2">💡 Dicas AFK:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Suba de nível para aumentar a taxa AFK</li>
                    <li>• Recursos são gerados mesmo offline</li>
                    <li>• Mob EXP é distribuído entre todos os mobs</li>
                    <li>• Deixe o jogo aberto para ganhos em tempo real</li>
                  </ul>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Próximo nível de taxa: Level {(player?.level || 1) + 10 - ((player?.level || 1) % 10)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AFK Progress Visualization */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Progresso em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="font-bold text-lg">{player?.afkRewards.exp || 0}</p>
                  <p className="text-sm">EXP Acumulado</p>
                  <div className="mt-2 text-xs text-muted-foreground">+{player?.afkRewards.rate}/min</div>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
                  <div className="text-3xl mb-2">💎</div>
                  <p className="font-bold text-lg">{player?.afkRewards.diamonds || 0}</p>
                  <p className="text-sm">Diamantes</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    +{Math.floor((player?.afkRewards.rate || 1) / 10)}/min
                  </div>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-green-100 to-green-200 rounded-lg">
                  <div className="text-3xl mb-2">🔥</div>
                  <p className="font-bold text-lg">{player?.afkRewards.mobExp || 0}</p>
                  <p className="text-sm">Mob EXP</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    +{Math.floor((player?.afkRewards.rate || 1) / 2)}/min
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "inventory") {
    const sortedMobs = player?.mobs ? [...player.mobs].sort((a, b) => {
      switch (inventoryFilter) {
        case "level-asc":
          return a.level - b.level
        case "level-desc":
          return b.level - a.level
        case "stars-asc":
          return a.stars - b.stars
        case "stars-desc":
          return b.stars - a.stars
        default:
          return 0
      }
    }) : []

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-blue-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">📦 Inventário</h1>
            <div className="text-right">
              <p>Total: {player?.mobs.length || 0} Mobs</p>
            </div>
          </div>

          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={inventoryFilter === "none" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInventoryFilter("none")}
                >
                  Padrão
                </Button>
                <Button
                  variant={inventoryFilter === "level-desc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInventoryFilter("level-desc")}
                >
                  Nível ↓
                </Button>
                <Button
                  variant={inventoryFilter === "level-asc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInventoryFilter("level-asc")}
                >
                  Nível ↑
                </Button>
                <Button
                  variant={inventoryFilter === "stars-desc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInventoryFilter("stars-desc")}
                >
                  Estrelas ↓
                </Button>
                <Button
                  variant={inventoryFilter === "stars-asc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInventoryFilter("stars-asc")}
                >
                  Estrelas ↑
                </Button>
              </div>
            </CardContent>
          </Card>

          {player && sortedMobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMobs.map((mob) => (
                <Card key={mob.id} className={`${getRarityBg(mob.stars)}`}>
                  <CardContent className="p-4">
                    <div className="text-center mb-3">
                      <div className="text-4xl mb-2">{mob.image}</div>
                      <h3 className="font-bold">{mob.name}</h3>
                      <div className="flex justify-center mb-1">
                        {Array.from({ length: Math.min(mob.stars, 5) }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${getRarityColor(mob.stars)}`} fill="currentColor" />
                        ))}
                        {mob.stars > 5 && <span className="text-sm font-bold ml-1">+{mob.stars - 5}</span>}
                      </div>
                      <Badge variant="secondary">{mob.role}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Level:</span>
                        <span>{mob.level}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>EXP:</span>
                          <span>
                            {mob.exp}/{mob.level * 100}
                          </span>
                        </div>
                        <Progress value={(mob.exp / (mob.level * 100)) * 100} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>HP: {mob.maxHp}</div>
                        <div>ATK: {mob.atk}</div>
                        <div>DEF: {mob.def}</div>
                        <div>SPD: {mob.spd}</div>
                      </div>
                    
                    <Button
                      onClick={() => setSelectedMobForLevelUp(mob)}
                      className="w-full mt-2"
                      size="sm"
                      variant="outline"
                    >
                      Level Up
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">Inventário Vazio</h3>
              <p className="text-muted-foreground mb-4">Você ainda não possui nenhum mob.</p>
              <Button onClick={() => setGameState("gacha")}>Ir para Gacha</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Level Up Dialog */}
      <Dialog open={!!selectedMobForLevelUp} onOpenChange={() => setSelectedMobForLevelUp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Level Up Manual</DialogTitle>
          </DialogHeader>
          {selectedMobForLevelUp && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">{selectedMobForLevelUp.image}</div>
                <h3 className="text-xl font-bold">{selectedMobForLevelUp.name}</h3>
                <p className="text-muted-foreground">Level {selectedMobForLevelUp.level}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-sm">
                    <span>EXP: {selectedMobForLevelUp.exp}/{selectedMobForLevelUp.level * 100}</span>
                  </div>
                  <Progress value={(selectedMobForLevelUp.exp / (selectedMobForLevelUp.level * 100)) * 100} className="mt-1" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-bold text-center">Escolha a quantidade de EXP:</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => {
                      levelUpMobManually(selectedMobForLevelUp.id, 100)
                      setSelectedMobForLevelUp(null)
                    }}
                    disabled={!player || player.diamonds < 10}
                    className="flex flex-col h-auto p-3"
                  >
                    <span className="font-bold">100 EXP</span>
                    <span className="text-xs">💎 10</span>
                  </Button>
                  
                  <Button
                    onClick={() => {
                      levelUpMobManually(selectedMobForLevelUp.id, 500)
                      setSelectedMobForLevelUp(null)
                    }}
                    disabled={!player || player.diamonds < 50}
                    className="flex flex-col h-auto p-3"
                  >
                    <span className="font-bold">500 EXP</span>
                    <span className="text-xs">💎 50</span>
                  </Button>
                  
                  <Button
                    onClick={() => {
                      levelUpMobManually(selectedMobForLevelUp.id, 1000)
                      setSelectedMobForLevelUp(null)
                    }}
                    disabled={!player || player.diamonds < 100}
                    className="flex flex-col h-auto p-3"
                  >
                    <span className="font-bold">1000 EXP</span>
                    <span className="text-xs">💎 100</span>
                  </Button>
                  
                  <Button
                    onClick={() => {
                      const expNeeded = (selectedMobForLevelUp.level * 100) - selectedMobForLevelUp.exp
                      levelUpMobManually(selectedMobForLevelUp.id, expNeeded)
                      setSelectedMobForLevelUp(null)
                    }}
                    disabled={!player || player.diamonds < Math.floor(((selectedMobForLevelUp.level * 100) - selectedMobForLevelUp.exp) / 10)}
                    className="flex flex-col h-auto p-3"
                    variant="secondary"
                  >
                    <span className="font-bold">Max Level</span>
                    <span className="text-xs">💎 {Math.floor(((selectedMobForLevelUp.level * 100) - selectedMobForLevelUp.exp) / 10)}</span>
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>Seus diamantes: 💎 {player?.diamonds}</p>
                  <p>Taxa: 10 EXP = 1 💎</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

  if (gameState === "battle") {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="min-h-screen bg-gradient-to-b from-red-900 to-orange-900 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6 text-white">
              <Button
                variant="outline"
                onClick={() => {
                  setBattleState(null)
                  setSelectedMobs([])
                  setGameState(battleState?.battleType === "tower" ? "tower" : "campaign")
                }}
                className="bg-white/10 text-white border-white/20"
              >
                ← Sair da Batalha
              </Button>
              <h1 className="text-2xl font-bold">⚔️ {battleState?.battleType === "tower" ? "Torre" : "Campanha"}</h1>
              <div className="text-right">
                <p>Turno: {(battleState?.currentTurn || 0) + 1}</p>
                <p className="text-sm">{battleState?.isPlayerTurn ? "Seu turno!" : "Turno do inimigo"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Player Team */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sua Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {battleState?.playerTeam.map((mob) => (
                    <div
                      key={mob.id}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        mob.isAlive ? "bg-green-50 border-green-200" : "bg-gray-100 border-gray-300 opacity-50"
                      } ${
                        battleState.selectedSkill?.targetType === "ally" && mob.isAlive
                          ? "hover:border-blue-400 hover:bg-blue-50"
                          : ""
                      } ${mob.animation ? `mob-${mob.animation}` : ""}`}
                      onClick={() => {
                        if (battleState.selectedSkill?.targetType === "ally" && mob.isAlive) {
                          selectTarget(mob.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl relative">
                          {mob.image}
                          {!mob.isAlive && <Skull className="absolute -top-1 -right-1 w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{mob.name}</p>
                          <p className="text-xs text-muted-foreground">Lv.{mob.level}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>HP:</span>
                              <span className={mob.currentHp < mob.maxHp * 0.3 ? "text-red-500" : ""}>
                                {mob.currentHp}/{mob.maxHp}
                              </span>
                            </div>
                            <Progress value={(mob.currentHp / mob.maxHp) * 100} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>ATK: {mob.atk}</span>
                              <span>SPD: {mob.spd}</span>
                            </div>
                          </div>

                          {/* Buffs/Debuffs */}
                          {(mob.buffs.length > 0 || mob.debuffs.length > 0) && (
                            <div className="flex gap-1 mt-1">
                              {mob.buffs.map((buff, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  +{buff.stat} ({buff.duration})
                                </Badge>
                              ))}
                              {mob.debuffs.map((debuff, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-red-100 text-red-800">
                                  -{debuff.stat} ({debuff.duration})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Battle Actions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sword className="w-5 h-5" />
                    Ações de Batalha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {battleState?.battleResult === "ongoing" ? (
                    <div className="space-y-6">
                      {/* Current Turn Info */}
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-4xl mb-2">{battleState.turnOrder[battleState.currentTurn]?.image}</div>
                        <p className="font-bold text-lg">{battleState.turnOrder[battleState.currentTurn]?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Lv.{battleState.turnOrder[battleState.currentTurn]?.level}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {battleState.isPlayerTurn ? "Escolha uma habilidade" : "Pensando..."}
                        </p>
                      </div>

                      {/* Turn Order */}
                      <div>
                        <p className="text-sm font-bold mb-2">Ordem dos Turnos:</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {battleState.turnOrder.map((unit, index) => (
                            <div
                              key={`${unit.id}-${index}`}
                              className={`flex-shrink-0 p-2 rounded border-2 text-center min-w-[60px] ${
                                index === battleState.currentTurn
                                  ? "border-yellow-500 bg-yellow-100"
                                  : unit.isPlayer
                                    ? "border-green-300 bg-green-50"
                                    : "border-red-300 bg-red-50"
                              } ${!unit.isAlive ? "opacity-50" : ""}`}
                            >
                              <div className="text-2xl">{unit.image}</div>
                              <div className="text-xs font-bold">{unit.spd}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Player Skills */}
                      {battleState.isPlayerTurn && (
                        <div className="space-y-3">
                          <p className="font-bold">Habilidades:</p>
                          {battleState.turnOrder[battleState.currentTurn]?.skills.map((skill) => (
                            <Button
                              key={skill.id}
                              onClick={() => selectSkill(skill)}
                              disabled={skill.currentCooldown > 0 || battleState.isAnimating}
                              className={`w-full justify-start text-left h-auto p-3 ${
                                battleState.selectedSkill?.id === skill.id ? "ring-2 ring-blue-500" : ""
                              }`}
                              variant={
                                skill.type === "ultimate"
                                  ? "destructive"
                                  : skill.type === "special"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold">{skill.name}</span>
                                  <div className="flex items-center gap-2">
                                    {skill.type === "ultimate" && <span className="text-xs">ULT</span>}
                                    {skill.currentCooldown > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        CD: {skill.currentCooldown}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                              </div>
                            </Button>
                          ))}

                          {battleState.selectedSkill && battleState.selectedSkill.targetType === "single" && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-bold mb-2">Selecione um alvo:</p>
                              <p className="text-xs text-muted-foreground">
                                {battleState.selectedSkill.effect.type === "damage"
                                  ? "Clique em um inimigo para atacar"
                                  : "Clique em um aliado para usar a habilidade"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {!battleState.isPlayerTurn && (
                        <div className="text-center p-8">
                          <div className="animate-pulse">
                            <div className="text-4xl mb-4">🤖</div>
                            <p className="text-lg font-bold">IA está pensando...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-6 p-8">
                      <div className="text-8xl">{battleState?.battleResult === "victory" ? "🏆" : "💀"}</div>
                      <h3 className="text-3xl font-bold">
                        {battleState?.battleResult === "victory" ? "Vitória!" : "Derrota!"}
                      </h3>
                      {battleState?.battleResult === "victory" && battleState.stageInfo && (
                        <div className="space-y-2">
                          <p className="text-lg">Recompensas obtidas:</p>
                          <div className="flex justify-center gap-4">
                            <Badge variant="secondary" className="text-lg p-2">
                              💎 +{battleState.stageInfo.rewards.diamonds}
                            </Badge>
                            <Badge variant="secondary" className="text-lg p-2">
                              ⭐ +{battleState.stageInfo.rewards.exp} EXP
                            </Badge>
                            {battleState.stageInfo.rewards.tickets && (
                              <Badge variant="secondary" className="text-lg p-2">
                                🎫 +{battleState.stageInfo.rewards.tickets}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <Button size="lg" onClick={() => completeBattle(battleState?.battleResult === "victory")}>
                        Continuar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enemy Team */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Sword className="w-5 h-5" />
                    Inimigos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {battleState?.enemyTeam.map((mob) => (
                    <div
                      key={mob.id}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        mob.isAlive ? "bg-red-50 border-red-200" : "bg-gray-100 border-gray-300 opacity-50"
                      } ${
                        battleState.selectedSkill?.targetType === "single" &&
                        battleState.selectedSkill?.effect.type === "damage" &&
                        mob.isAlive
                          ? "hover:border-red-400 hover:bg-red-100"
                          : ""
                      } ${mob.animation ? `mob-${mob.animation}` : ""}`}
                      onClick={() => {
                        if (
                          battleState.selectedSkill?.targetType === "single" &&
                          battleState.selectedSkill?.effect.type === "damage" &&
                          mob.isAlive
                        ) {
                          selectTarget(mob.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl relative">
                          {mob.image}
                          {!mob.isAlive && <Skull className="absolute -top-1 -right-1 w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{mob.name}</p>
                          <p className="text-xs text-muted-foreground">Lv.{mob.level}</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>HP:</span>
                              <span className={mob.currentHp < mob.maxHp * 0.3 ? "text-red-500" : ""}>
                                {mob.currentHp}/{mob.maxHp}
                              </span>
                            </div>
                            <Progress value={(mob.currentHp / mob.maxHp) * 100} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>ATK: {mob.atk}</span>
                              <span>SPD: {mob.spd}</span>
                            </div>
                          </div>

                          {/* Buffs/Debuffs */}
                          {(mob.buffs.length > 0 || mob.debuffs.length > 0) && (
                            <div className="flex gap-1 mt-1">
                              {mob.buffs.map((buff, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                  +{buff.stat} ({buff.duration})
                                </Badge>
                              ))}
                              {mob.debuffs.map((debuff, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-red-100 text-red-800">
                                  -{debuff.stat} ({debuff.duration})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Battle Log */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Log da Batalha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 overflow-y-auto bg-gray-50 p-4 rounded-lg text-sm space-y-1">
                  {battleState?.battleLog.map((log, index) => (
                    <p key={index} className="border-b border-gray-200 pb-1">
                      <span className="text-muted-foreground">[{index + 1}]</span> {log}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )
  }

  if (gameState === "profile") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-white">
            <Button
              variant="outline"
              onClick={() => setGameState("main")}
              className="bg-white/10 text-white border-white/20"
            >
              ← Voltar
            </Button>
            <h1 className="text-2xl font-bold">👤 Perfil</h1>
            <div></div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nickname</p>
                  <p className="font-bold">{player?.nickname}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{player?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="font-bold">⭐ {player?.level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">EXP</p>
                  <p className="font-bold">{player?.exp}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Progresso para próximo level</p>
                <Progress value={((player?.exp || 0) / ((player?.level || 1) * 1000)) * 100} className="w-full" />
                <p className="text-xs text-muted-foreground mt-1">
                  {player?.exp}/{(player?.level || 1) * 1000} EXP
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Recursos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl mb-2">💎</div>
                  <p className="font-bold">{player?.diamonds}</p>
                  <p className="text-sm text-muted-foreground">Diamantes</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <div className="text-2xl mb-2">🎫</div>
                  <p className="font-bold">{player?.tickets}</p>
                  <p className="text-sm text-muted-foreground">Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Progresso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campanha</p>
                  <p className="font-bold">Cap. {player?.campaignProgress.currentChapter}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Torre</p>
                  <p className="font-bold">Andar {player?.towerProgress.currentFloor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Mobs</p>
                  <p className="font-bold">{player?.mobs.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa AFK</p>
                  <p className="font-bold">{player?.afkRewards.rate}/min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Mobs por Raridade</p>
                <div className="space-y-1">
                  {[10, 9, 8, 7, 6, 5, 4, 3].map((stars) => {
                    const count = player?.mobs.filter((mob) => mob.stars === stars).length || 0
                    if (count === 0) return null
                    return (
                      <div key={stars} className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${getRarityColor(stars)}`} fill="currentColor" />
                          ))}
                          {stars > 5 && <span className="text-xs font-bold ml-1">+{stars - 5}</span>}
                        </div>
                        <span className="font-bold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Mobs por Função</p>
                <div className="space-y-1">
                  {["DPS", "Tank", "Support"].map((role) => {
                    const count = player?.mobs.filter((mob) => mob.role === role).length || 0
                    return (
                      <div key={role} className="flex justify-between items-center">
                        <span>{role}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Nível Médio dos Mobs</p>
                <p className="font-bold">
                  {player?.mobs.length
                    ? Math.floor(player.mobs.reduce((sum, mob) => sum + mob.level, 0) / player.mobs.length)
                    : 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState === "shop") {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-900 to-orange-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 text-white">
          <Button
            variant="outline"
            onClick={() => setGameState("main")}
            className="bg-white/10 text-white border-white/20"
          >
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">🛒 Loja</h1>
          <div className="text-right">
            <p>Diamantes: 💎 {player?.diamonds}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Pacote de Tickets</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>Conteúdo do pacote aqui</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedStage} onOpenChange={() => setSelectedStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Batalha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Deseja iniciar a batalha neste estágio?</p>
            <Button onClick={() => startBattle(selectedStage!, "campaign")}>Começar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div> // ✅ Fecha o JSX principal
  )
}
}