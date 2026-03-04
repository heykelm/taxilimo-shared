/**
 * Script pour tester l’API AviationStack en local.
 *
 * Usage (depuis la racine du repo) :
 *   npm run test:flight
 *   npm run test:flight -- AF1234 2025-01-31
 *
 * Crée un fichier .env.local à la racine avec :
 *   AVIATIONSTACK_API_KEY=ta_cle
 *   FLIGHT_TRACKER_ARRIVAL_IATA=NCE
 */

import { config } from 'dotenv'

config({ path: '.env.local' })
config({ path: '.env' })

const apiKey = process.env.AVIATIONSTACK_API_KEY
const arrivalIata = process.env.FLIGHT_TRACKER_ARRIVAL_IATA ?? undefined

const [flightNumber = 'AF7700', flightDate = new Date().toISOString().slice(0, 10)] =
  process.argv.slice(2)

async function main() {
  if (!apiKey) {
    console.error('Erreur: AVIATIONSTACK_API_KEY doit être défini (.env.local ou export)')
    process.exit(1)
  }

  const { getFlightStatusFromAviationStack } = await import('../src/utils/flight-tracker')

  console.log('Appel AviationStack…')
  console.log('  Vol:', flightNumber, '| Date:', flightDate, '| Arrivée IATA:', arrivalIata ?? '(tous)')
  console.log('')

  try {
    const result = await getFlightStatusFromAviationStack({
      flightNumber,
      flightDate,
      arrivalIata,
      apiKey,
    })
    if (result) {
      console.log('Résultat:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log('Aucun vol trouvé pour ce numéro/date.')
    }
  } catch (err) {
    console.error('Erreur:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
