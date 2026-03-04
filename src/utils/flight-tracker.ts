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
}

let amadeusToken: { token: string; expiresAt: number } | null = null

async function getAmadeusToken(clientId: string, clientSecret: string): Promise<string> {
  if (amadeusToken && amadeusToken.expiresAt > Date.now() + 60000) {
    return amadeusToken.token
  }

  const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`Amadeus auth error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  amadeusToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return amadeusToken!.token
}

function normalizeFlightNumber(flightNumber: string): { carrierCode: string; flightNumber: string; full: string } {
  const full = flightNumber.replace(/\s+/g, '').toUpperCase()
  const match = full.match(/^([A-Z0-9]{2,3})(\d{1,4})$/)
  if (!match) {
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
    raw: entry,
  }
}

function mapAmadeusEntry(entry: any): FlightStatusInfo {
  const segments = entry.segments?.[0] || {}
  const departure = segments.departure ?? {}
  const arrival = segments.arrival ?? {}

  return {
    flightNumber: `${entry.carrierCode}${entry.flightNumber}`,
    airline: {
      name: null, // Amadeus v2 schedule doesn't always provide airline name in the main object
      iata: entry.carrierCode,
    },
    status: null, // Amadeus status is usually mapped from specific segment flags or if it's in the response
    departure: {
      airport: {
        iata: departure.iataCode,
        terminal: departure.terminal,
      },
      scheduledTime: departure.at,
    },
    arrival: {
      airport: {
        iata: arrival.iataCode,
        terminal: arrival.terminal,
      },
      scheduledTime: arrival.at,
    },
    lastUpdated: new Date().toISOString(),
    raw: entry,
  }
}

const CARRIER_CODE_MAPPING: Record<string, string> = {
  'AFR': 'AF', // Air France
  'BAW': 'BA', // British Airways
  'DLH': 'LH', // Lufthansa
  'UAE': 'EK', // Emirates
  'THY': 'TK', // Turkish Airlines
  'KLM': 'KL', // KLM
  'SWR': 'LX', // Swiss
  'AIB': 'AIB', // Airbus (test)
  'VLG': 'VY', // Vueling
  'IBE': 'IB', // Iberia
  'RYR': 'FR', // Ryanair
  'SIA': 'SQ', // Singapore Airlines
  'QTR': 'QR', // Qatar Airways
  'ETD': 'EY', // Etihad
}

function getNormalizedCarrier(code: string): string {
  const upper = code.trim().toUpperCase()
  // 1. easyJet variants fallback to U2
  if (['EZY', 'EJU', 'EZS'].includes(upper)) {
    return 'U2'
  }
  // 2. Map 3-letter ICAO to 2-letter IATA if known
  return CARRIER_CODE_MAPPING[upper] || upper
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
  const carrierCode = getNormalizedCarrier(normalized.carrierCode)
  const fullFlightNumber = normalized.flightNumber

  const cacheKey = `amadeus_${carrierCode}${fullFlightNumber}_${normalizedDate}_${arrivalIata ?? 'ANY'}`

  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const token = await getAmadeusToken(amadeusClientId, amadeusClientSecret)

  const fetchFromAmadeus = async (carrier: string, number: string) => {
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
        const segments = f.segments || []
        return segments.some((s: any) =>
          s.arrival?.iataCode === arrivalIata.toUpperCase() ||
          s.departure?.iataCode === arrivalIata.toUpperCase()
        )
      })
      if (match) return mapAmadeusEntry(match)
    }

    // Default to first result
    return mapAmadeusEntry(flights[0])
  }

  // 1. Initial attempt with normalized carrier
  let mapped = await fetchFromAmadeus(carrierCode, fullFlightNumber)

  // 2. Retry without leading zeros if 404
  if (!mapped && /^[0]+/.test(fullFlightNumber)) {
    const strippedNumber = fullFlightNumber.replace(/^[0]+/, '')
    if (strippedNumber !== fullFlightNumber) {
      console.log(`[Amadeus] Retrying without leading zeros: ${carrierCode} ${fullFlightNumber} -> ${strippedNumber}`)
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
  const { preferredProvider = 'amadeus' } = params

  const hasAmadeus = !!(params.amadeusClientId?.trim() && params.amadeusClientSecret?.trim())
  const hasAviationStack = !!params.apiKey?.trim()

  if (preferredProvider === 'amadeus' && hasAmadeus) {
    try {
      const amadeusResult = await getFlightStatusFromAmadeus(params)
      if (amadeusResult) return amadeusResult
    } catch (error: any) {
      console.error('Amadeus flight tracking failed, falling back to AviationStack if available:', error.message || error)
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
