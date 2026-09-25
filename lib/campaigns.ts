import type { CityData } from './cities-data'

export const CAMPAIGNS = [
  { id: 'electronic-history', name: 'History of Electronic Music' },
  { id: 'world-ballads', name: 'World ballads' },
  { id: 'classical', name: 'Classical music' },
  { id: 'harmonic-songbook', name: 'Harmonic songbook' },
] as const

export type CampaignId = typeof CAMPAIGNS[number]['id']

/** Stage membership is independent of geographic pin: two eras can share a pin. */
export function citiesInCampaign(cities: CityData[], campaignId: CampaignId) {
  return cities.filter(city => city.campaigns.includes(campaignId)).sort((a,b) => a.year - b.year || a.name.localeCompare(b.name))
}
