"use client"

/* global CustomEvent */

import { cities } from "./cities-data"
import rankTitles from "../data/ui/rank-titles.json"

const COOKIE_NAME = "chikenchess_player"
const LEGACY_STORAGE_KEY = "chikenchess_campaign"

export const PLAYER_PROFILE_VERSION = 1
export const STARTING_GOLDEN_EGGS = 10
export const STARTING_MATCH_GOLDEN_EGGS = 1
export const GOLDEN_EGGS_PER_CITY_WIN = 10
export const GOLDEN_EGGS_PER_BEST_MOVE = 1
export const GOLDEN_EGGS_PER_WORST_MOVE = 3
export type RankedMoveReward = 'best' | 'worst'

export function rankedMoveEggReward(kind: RankedMoveReward, multiplier: 1 | 2 = 1) {
    return (kind === 'best' ? GOLDEN_EGGS_PER_BEST_MOVE : GOLDEN_EGGS_PER_WORST_MOVE) * multiplier
}

export interface PlayerProfile {
    profileVersion: number
    conqueredCityIds: string[]
    goldenEggs: number
    /** Lifetime total of golden eggs earned. Spending eggs never reduces it. */
    points: number
    rank: string
    winsCount: number
    lastPlayedCityId: string | null
    updatedAt: number
    moveRewardNotices: Record<RankedMoveReward, boolean>
    gameplayTipSeen: boolean
}

export const RANK_TIERS = rankTitles

export function calculateRank(points: number): string {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        if (points >= RANK_TIERS[i].minPoints) return RANK_TIERS[i].title
    }
    return RANK_TIERS[0].title
}

function integer(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : fallback
}

function createInitialProfile(now = Date.now()): PlayerProfile {
    return {
        profileVersion: PLAYER_PROFILE_VERSION,
        conqueredCityIds: [],
        goldenEggs: STARTING_GOLDEN_EGGS,
        points: STARTING_GOLDEN_EGGS,
        rank: calculateRank(STARTING_GOLDEN_EGGS),
        winsCount: 0,
        lastPlayedCityId: null,
        updatedAt: now,
        moveRewardNotices: { best: false, worst: false },
        gameplayTipSeen: false,
    }
}

/**
 * Brings both the old points-only profile and the current profile to the
 * spendable-egg economy. Old 1,000/200 point rewards are deliberately not
 * converted into currency; prior victories are each worth the current ten
 * eggs, plus the one-time starting gift.
 */
export function normalizePlayerProfile(raw: unknown, now = Date.now()): PlayerProfile {
    if (!raw || typeof raw !== "object") return createInitialProfile(now)
    const candidate = raw as Partial<PlayerProfile>
    const conqueredCityIds = Array.isArray(candidate.conqueredCityIds)
        ? [...new Set(candidate.conqueredCityIds.filter((id): id is string => typeof id === "string"))]
        : []
    const winsCount = integer(candidate.winsCount, conqueredCityIds.length)
    const isCurrent = candidate.profileVersion === PLAYER_PROFILE_VERSION
        && typeof candidate.goldenEggs === "number"

    if (!isCurrent) {
        const earned = STARTING_GOLDEN_EGGS + winsCount * GOLDEN_EGGS_PER_CITY_WIN
        return {
            profileVersion: PLAYER_PROFILE_VERSION,
            conqueredCityIds,
            goldenEggs: earned,
            points: earned,
            rank: calculateRank(earned),
            winsCount,
            lastPlayedCityId: typeof candidate.lastPlayedCityId === "string" ? candidate.lastPlayedCityId : null,
            updatedAt: now,
            moveRewardNotices: { best: false, worst: false },
            gameplayTipSeen: false,
        }
    }

    const goldenEggs = integer(candidate.goldenEggs)
    const points = Math.max(goldenEggs, integer(candidate.points))
    return {
        profileVersion: PLAYER_PROFILE_VERSION,
        conqueredCityIds,
        goldenEggs,
        points,
        rank: calculateRank(points),
        winsCount,
        lastPlayedCityId: typeof candidate.lastPlayedCityId === "string" ? candidate.lastPlayedCityId : null,
        updatedAt: integer(candidate.updatedAt, now),
        moveRewardNotices: {
            best: candidate.moveRewardNotices?.best === true,
            worst: candidate.moveRewardNotices?.worst === true,
        },
        gameplayTipSeen: candidate.gameplayTipSeen === true,
    }
}

function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
    return match ? decodeURIComponent(match[3]) : null
}

function writeCookie(name: string, value: string, days: number = 365) {
    if (typeof document === "undefined") return
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function eraseCookie(name: string) {
    if (typeof document === "undefined") return
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
}

export function getPlayerProfile(): PlayerProfile {
    if (typeof window === "undefined") return createInitialProfile()

    const cookieData = readCookie(COOKIE_NAME)
    if (cookieData) {
        try {
            const profile = normalizePlayerProfile(JSON.parse(cookieData))
            savePlayerProfile(profile)
            return profile
        } catch {
            // Continue with the mirrored local copy.
        }
    }

    const localData = localStorage.getItem(COOKIE_NAME)
    if (localData) {
        try {
            const profile = normalizePlayerProfile(JSON.parse(localData))
            savePlayerProfile(profile)
            return profile
        } catch {
            // Continue with the legacy campaign data.
        }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
        try {
            const parsedLegacy = JSON.parse(legacy)
            const completed = Array.isArray(parsedLegacy.completedCityIds) ? parsedLegacy.completedCityIds : []
            const profile = normalizePlayerProfile({
                conqueredCityIds: completed,
                winsCount: completed.length,
                lastPlayedCityId: parsedLegacy.lastPlayedCityId,
            })
            savePlayerProfile(profile)
            return profile
        } catch {
            // Start a clean profile if the old payload is corrupt.
        }
    }

    const profile = createInitialProfile()
    savePlayerProfile(profile)
    return profile
}

export function savePlayerProfile(profile: PlayerProfile) {
    if (typeof window === "undefined") return
    const json = JSON.stringify(profile)
    writeCookie(COOKIE_NAME, json)
    localStorage.setItem(COOKIE_NAME, json)
    if (typeof CustomEvent !== "undefined") window.dispatchEvent?.(new CustomEvent("chickenchess:profile-saved", { detail: profile }))
}

export interface ConquestResult {
    profile: PlayerProfile
    earnedEggs: number
    earnedPoints: number
    isFirstTime: boolean
    oldRank: string
    newRank: string
    rankedUp: boolean
}

function applyCityResult(
    source: PlayerProfile,
    cityId: string,
    now = Date.now(),
    earnedEggs = 0,
    collectedEggs = 0,
    won = true,
): ConquestResult {
    const current = normalizePlayerProfile(source, now)
    const oldRank = current.rank
    const isFirstTime = won && !current.conqueredCityIds.includes(cityId)
    const rewardEggs = integer(earnedEggs)
    const rewardPoints = rewardEggs + integer(collectedEggs)
    const points = current.points + rewardPoints
    const profile: PlayerProfile = {
        ...current,
        conqueredCityIds: isFirstTime ? [...current.conqueredCityIds, cityId] : current.conqueredCityIds,
        goldenEggs: current.goldenEggs + rewardEggs,
        points,
        rank: calculateRank(points),
        winsCount: current.winsCount + (won ? 1 : 0),
        lastPlayedCityId: cityId,
        updatedAt: now,
    }
    return {
        profile,
        earnedEggs: rewardEggs,
        earnedPoints: rewardPoints,
        isFirstTime,
        oldRank,
        newRank: profile.rank,
        rankedUp: oldRank !== profile.rank,
    }
}

export function applyCityVictory(source: PlayerProfile, cityId: string, now = Date.now(), earnedEggs = 0, collectedEggs = 0): ConquestResult {
    return applyCityResult(source, cityId, now, earnedEggs, collectedEggs)
}

export function applyCityDraw(source: PlayerProfile, cityId: string, now = Date.now(), earnedEggs = 0, collectedEggs = 0): ConquestResult {
    return applyCityResult(source, cityId, now, earnedEggs, collectedEggs, false)
}

export function settleCityDraw(cityId: string, earnedEggs = 0, collectedEggs = 0): ConquestResult {
    const result = applyCityDraw(getPlayerProfile(), cityId, Date.now(), earnedEggs, collectedEggs)
    savePlayerProfile(result.profile)
    return result
}

export function conquerCity(cityId: string, earnedEggs = 0, collectedEggs = 0): ConquestResult {
    const result = applyCityVictory(getPlayerProfile(), cityId, Date.now(), earnedEggs, collectedEggs)
    savePlayerProfile(result.profile)
    return result
}

export function applyRankedMoveReward(source: PlayerProfile, kind: RankedMoveReward, now = Date.now(), multiplier: 1 | 2 = 1) {
    const current = normalizePlayerProfile(source, now)
    const earnedEggs = rankedMoveEggReward(kind, multiplier)
    const firstNotice = !current.moveRewardNotices[kind]
    const points = current.points + earnedEggs
    const profile: PlayerProfile = {
        ...current,
        goldenEggs: current.goldenEggs + earnedEggs,
        points,
        rank: calculateRank(points),
        moveRewardNotices: { ...current.moveRewardNotices, [kind]: true },
        updatedAt: now,
    }
    return { profile, earnedEggs, firstNotice }
}

export function markRankedMoveNotice(kind: RankedMoveReward) {
    const current = getPlayerProfile()
    if (current.moveRewardNotices[kind]) return false
    savePlayerProfile({
        ...current,
        moveRewardNotices: { ...current.moveRewardNotices, [kind]: true },
        updatedAt: Date.now(),
    })
    return true
}

export function awardRankedMove(kind: RankedMoveReward, multiplier: 1 | 2 = 1) {
    const result = applyRankedMoveReward(getPlayerProfile(), kind, Date.now(), multiplier)
    savePlayerProfile(result.profile)
    return result
}

export function markGameplayTipSeen(): boolean {
    const profile = getPlayerProfile()
    if (profile.gameplayTipSeen) return false
    savePlayerProfile({ ...profile, gameplayTipSeen: true, updatedAt: Date.now() })
    return true
}

export function applyGoldenEggSpend(source: PlayerProfile, amount: number, now = Date.now()): PlayerProfile | null {
    if (!Number.isInteger(amount) || amount <= 0) return null
    const current = normalizePlayerProfile(source, now)
    if (current.goldenEggs < amount) return null
    return { ...current, goldenEggs: current.goldenEggs - amount, updatedAt: now }
}

export function spendGoldenEggs(amount: number): PlayerProfile | null {
    const profile = applyGoldenEggSpend(getPlayerProfile(), amount)
    if (profile) savePlayerProfile(profile)
    return profile
}

export function isCityUnlocked(_cityId: string): boolean {
    return true
}

export function isCityConquered(cityId: string): boolean {
    return getPlayerProfile().conqueredCityIds.includes(cityId)
}

export function getCampaignState() {
    const profile = getPlayerProfile()
    return {
        unlockedCityIds: cities.map(c => c.id),
        completedCityIds: profile.conqueredCityIds,
        lastPlayedCityId: profile.lastPlayedCityId,
        goldenEggs: profile.goldenEggs,
        points: profile.points,
        rank: profile.rank,
    }
}

export function unlockNextCity(currentCityId: string) {
    return conquerCity(currentCityId)
}

export function getLastUnlockedYear(): number {
    return Math.max(...cities.map(c => c.year))
}

export function resetCampaign() {
    if (typeof window === "undefined") return
    eraseCookie(COOKIE_NAME)
    localStorage.removeItem(COOKIE_NAME)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    window.location.reload()
}
