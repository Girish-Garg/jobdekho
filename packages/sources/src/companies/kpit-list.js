import { load } from 'cheerio'

// www.kpit.com/job-listing/ is rendered on the server from KPIT's TalentOjo
// requisitions; ?show_all=1 is the site's own "show all" link, every open
// job worldwide on one page (94 on 2026-10-04, 52 of them in India).
// robots.txt only keeps crawlers out of /wp-*. The site's own country=India
// filter is not used: it leaves out every job listed in two cities
// ("Bangalore,Pune"), 23 of the 52.
export const LIST_URL = 'https://www.kpit.com/job-listing/?show_all=1'

// The filter panel's script carries the site's own map of countries to its
// offices: var locationMap = {"India":["Bangalore","Chennai",...],...}.
const LOCATION_MAP = /var\s+locationMap\s*=\s*(\{[\s\S]*?\})\s*;/

function indianCities(html) {
  const m = LOCATION_MAP.exec(html)
  let map
  try {
    map = m ? JSON.parse(m[1]) : null
  } catch {
    map = null
  }
  const cities = Array.isArray(map?.India) ? map.India : null
  return cities && new Set(cities.map((city) => String(city).trim().toLowerCase()))
}

const flat = (node) => node.text().replace(/\s+/g, ' ').trim()

// "Apply" links to the TalentOjo posting, ".../job-apply/#/Career%20Portal/82118".
const idOf = (href) => String(href || '').match(/\/Career(?:%20| )Portal\/(\d+)\s*$/)?.[1] || ''

// The job rows in the page's own order, each { id, title, places,
// experience }, keeping those with an office in India. A page without the
// office map is not the listing this parser knows, and is thrown rather
// than read as a quiet board.
export function parseListing(html) {
  const india = indianCities(String(html || ''))
  if (!india) throw new Error('kpit: the job listing no longer says which offices are in India')
  const $ = load(String(html))
  return $('.job-div').map((_, el) => {
    const box = $(el)
    return {
      id: idOf(box.find('a.job-apply').first().attr('href')),
      title: flat(box.find('h3').first()),
      places: flat(box.find('.job-loaction').first()).split(',').map((p) => p.trim()).filter(Boolean),
      experience: flat(box.find('.job-exp').first()).replace(/^Exp\.?\s*/i, ''),
    }
  }).get().filter((row) => row.id && row.title && row.places.some((p) => india.has(p.toLowerCase())))
}
