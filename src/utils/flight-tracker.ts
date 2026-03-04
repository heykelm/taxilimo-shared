import type { FlightStatusInfo } from '../types'

const cache = new Map<
  string,
  { expiresAt: number; data: any }
>()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export interface FlightStatusParams {
  flightNumber: string
  flightDate: string
  arrivalIata?: string
  apiKey?: string // For AviationStack
  amadeusClientId?: string
  amadeusClientSecret?: string
  cacheTtlMs?: number
  preferredProvider?: 'amadeus' | 'aviationstack'
  strictProvider?: boolean
}

let amadeusToken: { token: string; expiresAt: number } | null = null

async function getAmadeusToken(clientId: string, clientSecret: string): Promise<string> {
  if (amadeusToken && amadeusToken.expiresAt > Date.now() + 60000) {
    return amadeusToken.token
  }

  const isProd = process.env.AMADEUS_ENV === 'production'
  const baseUrl = isProd ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com'

  const response = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No error body')
    throw new Error(`Amadeus auth error (${isProd ? 'prod' : 'test'}): ${response.status} ${response.statusText} - ${errorBody}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  amadeusToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return amadeusToken.token
}

function normalizeFlightNumber(flightNumber: string): { carrierCode: string; flightNumber: string; full: string } {
  const full = flightNumber.replace(/\s+/g, '').toUpperCase()
  // Look for 2-3 letters at the start, followed by digits
  const match = full.match(/^([A-Z]{2,3})(\d{1,4})$/)
  if (!match) {
    // Fallback: if it's already something like U21631, try to split it manually
    const manualMatch = full.match(/^([A-Z][0-9A-Z])(\d{1,4})$/)
    if (manualMatch) {
      return { carrierCode: manualMatch[1], flightNumber: manualMatch[2], full }
    }
    return { carrierCode: '', flightNumber: full, full }
  }
  return { carrierCode: match[1], flightNumber: match[2], full }
}

function normalizeDate(dateInput: string): string {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid flight date provided')
  }
  return date.toISOString().slice(0, 10)
}

function mapAviationStackEntry(entry: any): FlightStatusInfo {
  const departure = entry.departure ?? {}
  const arrival = entry.arrival ?? {}
  const airline = entry.airline ?? {}

  return {
    flightNumber: entry.flight?.iata ?? entry.flight?.icao ?? entry.flight_number ?? '',
    airline: {
      name: airline.name ?? null,
      iata: airline.iata ?? airline.icao ?? null,
    },
    status: entry.flight_status ?? null,
    departure: {
      airport: {
        name: departure.airport ?? null,
        iata: departure.iata ?? departure.icao ?? null,
        terminal: departure.terminal ?? null,
        gate: departure.gate ?? null,
        baggage: null,
        timezone: departure.timezone ?? null,
        city: departure.city ?? null,
      },
      scheduledTime: departure.scheduled ?? null,
      estimatedTime: departure.estimated ?? null,
      actualTime: departure.actual ?? null,
      delayMinutes: typeof departure.delay === 'number' ? departure.delay : null,
    },
    arrival: {
      airport: {
        name: arrival.airport ?? null,
        iata: arrival.iata ?? arrival.icao ?? null,
        terminal: arrival.terminal ?? null,
        gate: arrival.gate ?? null,
        baggage: arrival.baggage ?? null,
        timezone: arrival.timezone ?? null,
        city: arrival.city ?? null,
      },
      scheduledTime: arrival.scheduled ?? null,
      estimatedTime: arrival.estimated ?? null,
      actualTime: arrival.actual ?? null,
      delayMinutes: typeof arrival.delay === 'number' ? arrival.delay : null,
    },
    lastUpdated: entry.updated ?? entry.estimated ?? entry.arrival?.estimated ?? null,
    provider: 'aviationstack',
    raw: entry,
  }
}

const AIRLINE_NAMES: Record<string, string> = {
  'EK': 'Emirates', 'AF': 'Air France', 'U2': 'EasyJet', 'LH': 'Lufthansa',
  'BA': 'British Airways', 'TK': 'Turkish Airlines', 'QR': 'Qatar Airways',
  'EY': 'Etihad', 'FR': 'Ryanair', 'VY': 'Vueling', 'TO': 'Transavia',
  'LX': 'Swiss', 'OS': 'Austrian', 'SN': 'Brussels Airlines', 'SK': 'SAS',
  'AY': 'Finnair', 'TP': 'TAP Portugal', 'LO': 'LOT Polish', 'KM': 'Air Malta',
  'JU': 'Air Serbia', 'OU': 'Croatia Airlines', 'A3': 'Aegean', 'AZ': 'ITA Airways',
  'UX': 'Air Europa', 'IB': 'Iberia', 'AA': 'American Airlines', 'DL': 'Delta',
  'UA': 'United', 'AC': 'Air Canada', 'AT': 'Royal Air Maroc', 'TU': 'Tunisair',
  'AH': 'Air Algérie', 'BJ': 'Nouvelair', 'V7': 'Volotea', 'XK': 'Air Corsica',
  'BT': 'Air Baltic', 'TS': 'Air Transat', 'EI': 'Aer Lingus', 'LY': 'El Al',
  'EW': 'Eurowings', 'LS': 'Jet2', 'LG': 'Luxair', 'DY': 'Norwegian',
  'PC': 'Pegasus', 'SV': 'Saudia', 'QS': 'Smartwings', 'RO': 'Tarom',
  'T7': 'Twin Jet', 'WF': 'Wideroe',
}

function mapAmadeusEntry(entry: any): FlightStatusInfo {
  const flightPoints = entry.flightPoints || []
  const depPoint = flightPoints[0] || {}
  const arrPoint = flightPoints[flightPoints.length - 1] || {}
  const carrierCode = entry.flightDesignator?.carrierCode || entry.carrierCode || ''
  const flightNumber = entry.flightDesignator?.flightNumber || entry.flightNumber || ''

  let status: string | null = null
  const depDelay = depPoint.departure?.timings?.find((t: any) => t.qualifier === 'STD')?.delays?.[0]?.duration
  const arrDelay = arrPoint.arrival?.timings?.find((t: any) => t.qualifier === 'STA')?.delays?.[0]?.duration

  if (depDelay || arrDelay) status = 'DELAYED'

  const scheduledDep = depPoint.departure?.timings?.find((t: any) => t.qualifier === 'STD')?.value
  const scheduledArr = arrPoint.arrival?.timings?.find((t: any) => t.qualifier === 'STA')?.value

  return {
    flightNumber: `${carrierCode}${flightNumber}`,
    airline: {
      name: AIRLINE_NAMES[carrierCode] || null,
      iata: carrierCode,
    },
    status: status || entry.status || null,
    departure: {
      airport: {
        iata: depPoint.iataCode,
        terminal: depPoint.departure?.terminal?.code,
        gate: depPoint.departure?.gate?.mainGate,
      },
      scheduledTime: scheduledDep,
      estimatedTime: depPoint.departure?.timings?.find((t: any) => t.qualifier === 'ETD')?.value || scheduledDep,
      actualTime: depPoint.departure?.timings?.find((t: any) => t.qualifier === 'ATD')?.value,
      delayMinutes: depDelay ? parseInt(depDelay.replace('PT', '').replace('M', '')) : null,
    },
    arrival: {
      airport: {
        iata: arrPoint.iataCode,
        terminal: arrPoint.arrival?.terminal?.code,
        gate: arrPoint.arrival?.gate?.mainGate,
      },
      scheduledTime: scheduledArr,
      estimatedTime: arrPoint.arrival?.timings?.find((t: any) => t.qualifier === 'ETA')?.value || scheduledArr,
      actualTime: arrPoint.arrival?.timings?.find((t: any) => t.qualifier === 'ATA')?.value,
      delayMinutes: arrDelay ? parseInt(arrDelay.replace('PT', '').replace('M', '')) : null,
    },
    lastUpdated: new Date().toISOString(),
    provider: 'amadeus',
    raw: entry,
  }
}

const ICAO_TO_IATA: Record<string, string> = {
  'EZY': 'U2', 'AFR': 'AF', 'BAW': 'BA', 'DLH': 'LH', 'UAE': 'EK',
  'RYR': 'FR', 'VLG': 'VY', 'IBE': 'IB', 'TRA': 'HV', 'SWR': 'LX',
  'THY': 'TK', 'VAP': 'V7', 'TVF': 'TO', 'AAL': 'AA', 'DAL': 'DL',
  'UAL': 'UA', 'SIA': 'SQ', 'QFA': 'QF', 'KLM': 'KL', 'LZA': 'LO',
  'EJU': 'U2', 'EZS': 'U2', 'RBG': '8B', 'ABY': 'G9', 'WZZ': 'W6',
  'RAM': 'AT', 'AHY': 'J2', 'ETH': 'ET', 'QTR': 'QR', 'FIN': 'AY',
  'SAS': 'SK', 'AUA': 'OS', 'BEL': 'SN', 'TAP': 'TP', 'LOT': 'LO',
  'VOE': 'V7', 'ACA': 'AC', 'CCM': 'XK', 'BTI': 'BT', 'TSC': 'TS',
  'EIN': 'EI', 'ELY': 'LY', 'EWG': 'EW', 'EXS': 'LS', 'LGL': 'LG',
  'NOZ': 'DY', 'IBK': 'D8', 'NSZ': 'DH', 'PGT': 'PC', 'SVA': 'SV',
  'TVS': 'QS', 'ROT': 'RO', 'TJT': 'T7', 'WIF': 'WF', 'DAH': 'AH',
  'TAR': 'TU', 'ITY': 'AZ',
}

function normalizeCarrierCode(code: string): string {
  const upper = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
  return ICAO_TO_IATA[upper] || upper;
}

export async function getFlightStatusFromAmadeus({
  flightNumber,
  flightDate,
  arrivalIata,
  amadeusClientId,
  amadeusClientSecret,
  cacheTtlMs = DEFAULT_TTL,
}: FlightStatusParams): Promise<FlightStatusInfo | null> {
  if (!amadeusClientId || amadeusClientId.trim() === '') {
    throw new Error('Amadeus flight tracker: Client ID is missing or empty')
  }
  if (!amadeusClientSecret || amadeusClientSecret.trim() === '') {
    throw new Error('Amadeus flight tracker: Client Secret is missing or empty')
  }

  const normalized = normalizeFlightNumber(flightNumber)
  const normalizedDate = normalizeDate(flightDate)
  const carrierCode = normalizeCarrierCode(normalized.carrierCode)
  const fullFlightNumber = normalized.flightNumber

  const cacheKey = `amadeus_${carrierCode}${fullFlightNumber}_${normalizedDate}_${arrivalIata ?? 'ANY'}`

  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const token = await getAmadeusToken(amadeusClientId, amadeusClientSecret)

  const fetchFromAmadeus = async (carrier: string, number: string) => {
    try {
      // Check if we should use production or test environment
      const isProd = process.env.AMADEUS_ENV === 'production'
      const baseUrl = isProd ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com'
      const url = new URL(`${baseUrl}/v2/schedule/flights`)

      url.searchParams.set('carrierCode', carrier)
      url.searchParams.set('flightNumber', number)
      url.searchParams.set('scheduledDepartureDate', normalizedDate)

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Amadeus flight tracker: API error: ${response.status} ${response.statusText}`)
      }

      const payload = (await response.json()) as { data?: any[] }
      const flights = payload.data || []

      if (flights.length === 0) return null

      // If arrivalIata is provided, try to find a match in the data
      if (arrivalIata) {
        const match = flights.find(f => {
          const points = f.flightPoints || []
          return points.some((p: any) => p.iataCode === arrivalIata.toUpperCase())
        })
        if (match) return mapAmadeusEntry(match)
      }

      // Default to first result
      return mapAmadeusEntry(flights[0])
    } catch (err) {
      return null
    }
  }

  // 1. Initial attempt with normalized carrier
  let mapped = await fetchFromAmadeus(carrierCode, fullFlightNumber)

  // 2. Fallback: original carrier
  if (!mapped && normalized.carrierCode !== carrierCode) {
    mapped = await fetchFromAmadeus(normalized.carrierCode, fullFlightNumber)
  }

  // 3. Fallback: easyJet variants -> U2
  if (!mapped && ['EZS', 'EJU', 'EZY', 'DS'].includes(normalized.carrierCode)) {
    mapped = await fetchFromAmadeus('U2', fullFlightNumber)
  }

  // 4. Fallback: Emirates leading zeros
  if (!mapped && carrierCode === 'EK' && fullFlightNumber.startsWith('0')) {
    const strippedNumber = fullFlightNumber.replace(/^0+/, '')
    if (strippedNumber !== fullFlightNumber) {
      mapped = await fetchFromAmadeus(carrierCode, strippedNumber)
    }
  }

  cache.set(cacheKey, {
    data: mapped,
    expiresAt: Date.now() + cacheTtlMs,
  })

  return mapped
}

export async function getFlightStatusFromAviationStack({
  flightNumber,
  flightDate,
  arrivalIata,
  apiKey,
  cacheTtlMs = DEFAULT_TTL,
}: FlightStatusParams): Promise<FlightStatusInfo | null> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('AviationStack flight tracker: API Key is missing or empty')
  }

  const normalized = normalizeFlightNumber(flightNumber)
  const normalizedDate = normalizeDate(flightDate)
  // Cache key includes arrivalIata because we filter locally now
  const cacheKey = `avstack_${normalized.full}_${normalizedDate}_${arrivalIata ?? 'ANY'}`

  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const url = new URL('https://api.aviationstack.com/v1/flights')
  url.searchParams.set('access_key', apiKey)
  url.searchParams.set('flight_iata', normalized.full)
  url.searchParams.set('flight_date', normalizedDate)

  // Note: We intentionally DO NOT send arr_iata to the API anymore.
  // This avoids cases where the API fails to filter correctly or uses different codes.
  // We fetch all flights for this number and date, then filter here.

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
    // @ts-ignore - Next.js fetch extension
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`AviationStack flight tracker: API error: ${response.status} ${response.statusText}`)
  }

  const payload = (await response.json()) as { error?: { info: string }; data?: any[] }

  if (payload.error) {
    throw new Error(`AviationStack flight tracker: ${payload.error.info || 'API returned an error'}`)
  }

  const flights: any[] = Array.isArray(payload.data) ? payload.data : []
  let matchingFlight: any | undefined = flights[0]

  if (arrivalIata && flights.length > 0) {
    const target = arrivalIata.toUpperCase()
    matchingFlight = flights.find(
      (flight) =>
        (flight.arrival?.iata === target || flight.arrival?.icao === target) ||
        (flight.departure?.iata === target || flight.departure?.icao === target)
    ) || flights[0]
  }

  const mapped = matchingFlight ? mapAviationStackEntry(matchingFlight) : null

  cache.set(cacheKey, {
    data: mapped,
    expiresAt: Date.now() + cacheTtlMs,
  })

  return mapped
}

export async function getFlightStatus(params: FlightStatusParams): Promise<FlightStatusInfo | null> {
  const { preferredProvider = 'amadeus', strictProvider = false } = params

  const hasAmadeus = !!(params.amadeusClientId?.trim() && params.amadeusClientSecret?.trim())
  const hasAviationStack = !!params.apiKey?.trim()

  if (preferredProvider === 'amadeus' && hasAmadeus) {
    try {
      const amadeusResult = await getFlightStatusFromAmadeus(params)
      if (amadeusResult) return amadeusResult

      // If Amadeus returned null (definitive 404) and we are in strict mode, stop here
      if (strictProvider) return null
    } catch (error: any) {
      console.error('Amadeus flight tracking failed:', error.message || error)
      // If preferred failed and we are in strict mode, stop here
      if (strictProvider) return null
    }
  }

  if (hasAviationStack) {
    return getFlightStatusFromAviationStack(params)
  }

  if (preferredProvider === 'aviationstack' && hasAmadeus) {
    try {
      const amadeusResult = await getFlightStatusFromAmadeus(params)
      if (amadeusResult) return amadeusResult
    } catch (error: any) {
      console.error('Amadeus flight tracking failed:', error.message || error)
    }
  }

  return null
}
