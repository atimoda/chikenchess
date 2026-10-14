import type { CityData } from './cities-data'
import campaigns from '../data/ui/campaigns.json'

export const CAMPAIGNS = campaigns as unknown as readonly [
  { readonly id: 'electronic-history'; readonly name: string },
  { readonly id: 'world-ballads'; readonly name: string },
  { readonly id: 'classical'; readonly name: string },
  { readonly id: 'harmonic-songbook'; readonly name: string },
  { readonly id: 'brazilian'; readonly name: string },
  { readonly id: 'world-rhythms'; readonly name: string },
  { readonly id: 'african-rhythms'; readonly name: string },
]

export type CampaignId = typeof CAMPAIGNS[number]['id']

/** Stage membership is independent of geographic pin: two eras can share a pin. */
export function citiesInCampaign(cities: CityData[], campaignId: CampaignId) {
  return cities.filter(city => city.campaigns.includes(campaignId)).sort((a,b) => a.year - b.year || a.name.localeCompare(b.name))
}
