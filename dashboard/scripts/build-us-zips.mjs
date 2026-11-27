import { createReadStream, existsSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { normalizePlace } from '../src/lib/places.js'

const FILE = process.argv[2]
if (!FILE || !existsSync(FILE)) {
  console.error('Usage: node scripts/build-us-zips.mjs path/to/US.txt')
  process.exit(1)
}

// GeoNames columns: 1 = postal code, 2 = place name, 4 = state code
const out = {}
const lines = createInterface({ input: createReadStream(FILE, 'utf8'), crlfDelay: Infinity })
for await (const line of lines) {
  const c = line.split('\t')
  const [zip, place, state] = [c[1], c[2], c[4]]
  if (!/^\d{5}$/.test(zip ?? '') || !place || !state) continue
  const byPlace = (out[state] ??= {})
  const list = (byPlace[normalizePlace(place)] ??= [])
  if (!list.includes(zip)) list.push(zip)
}
for (const byPlace of Object.values(out)) for (const list of Object.values(byPlace)) list.sort()

writeFileSync('src/data/us-zips.json', JSON.stringify(out))
const fl = out.FL ?? {}
console.log('States:', Object.keys(out).length)
console.log('Destin:', fl[normalizePlace('Destin')], '| Miramar Beach:', fl[normalizePlace('Miramar Beach')])
console.log('Jacksonville ZIP count:', (fl.jacksonville ?? []).length)