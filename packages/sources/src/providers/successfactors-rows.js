import { load } from 'cheerio'

// A classic Career Site Builder search page is rendered on the server, in one
// of two layouts. The table (EY, YASH, Asian Paints, Volvo, Mahindra, ZF) has
// one tr.data-row per job, holding the title link, the place and, on sites
// that show it, the date; each row repeats its link and place for phones, so
// the first of each is read. The tiles (Tata Power) have one li.job-tile per
// job, and which fields a tile shows is each site's choice (Tata Power's show
// department, state and career stage, and no place), so only its link and
// title are read; the job page supplies the rest.
//
// The newer "Unify" template (body class "unify": Wipro, HCLTech, BT and
// Standard Chartered in September 2026) sends the same URL as an empty
// shell and draws the jobs in the browser from /services/recruiting/v1/jobs,
// under a path every CSB robots.txt disallows. Its job pages are empty
// shells too (window.jobDataHidden = {}), so nothing on a Unify site can be
// read without going where robots.txt says not to. The flag lets the
// adapter say so instead of reporting an empty board.
const UNIFY = /\bunify\b/

// "/job/Pune-Graduate-Engineer-Trainee-MH-411014/1415125800/": the number is
// the posting id. The words before it are the title and place, which a
// recruiter can edit without the posting becoming a different job.
const idOf = (href) => String(href || '').split(/[?#]/)[0].split('/').filter(Boolean).pop() || ''

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// The place span also holds "+4 more..." in a <small>; only its own text is
// the place.
const ownText = (el) => squash(el.contents().filter((_, n) => n.type === 'text').text())

// "Results 1 - 25 of 2637" over a table, "Showing 1 to 4 of 4 Jobs" over
// tiles: the last figure is the whole India count.
function totalOf($) {
  const table = $('.paginationLabel').first().find('b').last().text()
  const tiles = $('#tile-search-results-label').first().text().match(/of\s+([\d,]+)/)?.[1]
  const n = Number(String(table || tiles || '').replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function tableRow($, el) {
  const tr = $(el)
  const link = tr.find('a.jobTitle-link').first()
  const place = tr.find('.colLocation .jobLocation').first()
  return {
    href: link.attr('href') || '',
    title: squash(link.text()),
    location: ownText(place.length ? place : tr.find('.jobLocation').last()),
    date: squash(tr.find('.jobDate').last().text()),
  }
}

function tileRow($, el) {
  const li = $(el)
  const link = li.find('a.jobTitle-link').first()
  return { href: li.attr('data-url') || link.attr('href') || '', title: squash(link.text()), location: '', date: '' }
}

export function parseSearch(html) {
  const $ = load(String(html || ''))
  const found = [
    ...$('tr.data-row').map((_, el) => tableRow($, el)).get(),
    ...$('li.job-tile').map((_, el) => tileRow($, el)).get(),
  ]
  const rows = found.map((row) => ({ id: idOf(row.href), ...row })).filter((row) => row.id && row.href)
  return { rows, total: totalOf($), unify: UNIFY.test($('body').attr('class') || '') }
}
