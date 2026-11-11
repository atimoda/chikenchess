import { cities } from './lib/cities-data'
import { CAMPAIGNS, citiesInCampaign } from './lib/campaigns'
for (const c of CAMPAIGNS) console.log(c.id, citiesInCampaign(cities, c.id).map(x=>x.id).join(','))
