"use client"

import { cities, type CityData } from "./cities-data"

const STORAGE_KEY = "chikenchess_campaign"

interface CampaignState {
    unlockedCityIds: string[]
    completedCityIds: string[]
    lastPlayedCityId: string | null
}

const INITIAL_STATE: CampaignState = {
    unlockedCityIds: ["dusseldorf"], // Start with only the first city
    completedCityIds: [],
    lastPlayedCityId: null,
}

export function getCampaignState(): CampaignState {
    if (typeof window === "undefined") return INITIAL_STATE

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return INITIAL_STATE

    try {
        return JSON.parse(stored)
    } catch {
        return INITIAL_STATE
    }
}

export function saveCampaignState(state: CampaignState) {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function unlockNextCity(currentCityId: string) {
    const state = getCampaignState()

    // Mark current as completed if not already
    if (!state.completedCityIds.includes(currentCityId)) {
        state.completedCityIds.push(currentCityId)
    }

    // Find next city index
    const currentIndex = cities.findIndex(c => c.id === currentCityId)
    if (currentIndex >= 0 && currentIndex < cities.length - 1) {
        const nextCity = cities[currentIndex + 1]
        if (!state.unlockedCityIds.includes(nextCity.id)) {
            state.unlockedCityIds.push(nextCity.id)
        }
    }

    saveCampaignState(state)
    return state
}

export function isCityUnlocked(cityId: string): boolean {
    const state = getCampaignState()
    return state.unlockedCityIds.includes(cityId)
}

export function getLastUnlockedYear(): number {
    const state = getCampaignState()
    const unlockedCities = cities.filter(c => state.unlockedCityIds.includes(c.id))
    // Return the max year among unlocked cities
    return Math.max(...unlockedCities.map(c => c.year))
}

export function resetCampaign() {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
}
