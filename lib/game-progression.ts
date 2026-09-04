"use client"

import { cities } from "./cities-data"

const COOKIE_NAME = "chikenchess_player"
const LEGACY_STORAGE_KEY = "chikenchess_campaign"

export interface PlayerProfile {
    conqueredCityIds: string[]
    points: number
    rank: string
    winsCount: number
    lastPlayedCityId: string | null
    updatedAt: number
}

export const RANK_TIERS = [
    { minPoints: 0, title: "Novice Beatmaker" },
    { minPoints: 1000, title: "Rhythm Apprentice" },
    { minPoints: 3000, title: "Groove Master" },
    { minPoints: 5000, title: "Synth Virtuoso" },
    { minPoints: 7000, title: "Grandmaster Producer" },
]

export const POINTS_FIRST_CONQUEST = 1000
export const POINTS_REPLAY_WIN = 200

export function calculateRank(points: number): string {
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        if (points >= RANK_TIERS[i].minPoints) {
            return RANK_TIERS[i].title
        }
    }
    return RANK_TIERS[0].title
}

const INITIAL_PROFILE: PlayerProfile = {
    conqueredCityIds: [],
    points: 0,
    rank: "Novice Beatmaker",
    winsCount: 0,
    lastPlayedCityId: null,
    updatedAt: Date.now(),
}

// Cookie helpers
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
    if (typeof window === "undefined") return INITIAL_PROFILE

    // 1. Try reading from cookie first
    const cookieData = readCookie(COOKIE_NAME)
    if (cookieData) {
        try {
            const parsed = JSON.parse(cookieData)
            return {
                ...INITIAL_PROFILE,
                ...parsed,
                rank: calculateRank(parsed.points || 0),
            }
        } catch {
            // fallback
        }
    }

    // 2. Fallback to localStorage
    const localData = localStorage.getItem(COOKIE_NAME)
    if (localData) {
        try {
            const parsed = JSON.parse(localData)
            const profile = {
                ...INITIAL_PROFILE,
                ...parsed,
                rank: calculateRank(parsed.points || 0),
            }
            // Sync to cookie
            writeCookie(COOKIE_NAME, JSON.stringify(profile))
            return profile
        } catch {
            // fallback
        }
    }

    // 3. Migrate from legacy campaign state if present
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
        try {
            const parsedLegacy = JSON.parse(legacy)
            const completed = parsedLegacy.completedCityIds || []
            const profile: PlayerProfile = {
                conqueredCityIds: completed,
                points: completed.length * POINTS_FIRST_CONQUEST,
                rank: calculateRank(completed.length * POINTS_FIRST_CONQUEST),
                winsCount: completed.length,
                lastPlayedCityId: parsedLegacy.lastPlayedCityId || null,
                updatedAt: Date.now(),
            }
            savePlayerProfile(profile)
            return profile
        } catch {
            // ignore
        }
    }

    return INITIAL_PROFILE
}

export function savePlayerProfile(profile: PlayerProfile) {
    if (typeof window === "undefined") return
    const json = JSON.stringify(profile)
    writeCookie(COOKIE_NAME, json)
    localStorage.setItem(COOKIE_NAME, json)
}

export interface ConquestResult {
    profile: PlayerProfile
    earnedPoints: number
    isFirstTime: boolean
    oldRank: string
    newRank: string
    rankedUp: boolean
}

export function conquerCity(cityId: string): ConquestResult {
    const profile = getPlayerProfile()
    const oldRank = profile.rank
    const isFirstTime = !profile.conqueredCityIds.includes(cityId)
    const earnedPoints = isFirstTime ? POINTS_FIRST_CONQUEST : POINTS_REPLAY_WIN

    if (isFirstTime) {
        profile.conqueredCityIds.push(cityId)
    }
    profile.points += earnedPoints
    profile.winsCount += 1
    profile.lastPlayedCityId = cityId
    profile.updatedAt = Date.now()
    profile.rank = calculateRank(profile.points)

    savePlayerProfile(profile)

    return {
        profile,
        earnedPoints,
        isFirstTime,
        oldRank,
        newRank: profile.rank,
        rankedUp: oldRank !== profile.rank,
    }
}

// In v3.0, all cities are unlocked and playable from the start!
export function isCityUnlocked(_cityId: string): boolean {
    return true
}

export function isCityConquered(cityId: string): boolean {
    const profile = getPlayerProfile()
    return profile.conqueredCityIds.includes(cityId)
}

// Backward-compat for legacy calls
export function getCampaignState() {
    const profile = getPlayerProfile()
    return {
        unlockedCityIds: cities.map(c => c.id), // All cities unlocked in v3.0!
        completedCityIds: profile.conqueredCityIds,
        lastPlayedCityId: profile.lastPlayedCityId,
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
