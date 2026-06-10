/**
 * Compact booking quote URLs: /r/q/{token} instead of long query strings.
 * Token is base64url of a pipe-delimited payload (coords + date/time + vehicle + service).
 */

import type { BookingQuoteServiceType } from './booking-quote-message'
import { vehicleIdForQuoteUrl } from './booking-quote-message'

const TOKEN_VERSION = '1'

export type DecodedBookingQuoteToken = {
  pickupLat: number
  pickupLng: number
  dropoffLat?: number
  dropoffLng?: number
  pickupDate: string
  pickupTime: string
  vehicleId?: string
  serviceType: BookingQuoteServiceType
}

type EncodeInput = {
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  pickupDate?: string
  pickupTime?: string
  vehicleTypeCode?: string
  vehicleId?: string
  serviceType?: BookingQuoteServiceType
}

function isValidCoord(lat?: number, lng?: number): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  )
}

function roundCoord(n: number): number {
  return Math.round(n * 1e5) / 1e5
}

function vehicleToTokenChar(vehicleId?: string | null, typeCode?: string | null): string {
  const id = vehicleIdForQuoteUrl(vehicleId, typeCode)?.toLowerCase() || ''
  if (id.includes('v-class') || id.includes('van')) return 'v'
  if (id.includes('s-class') || id.includes('premium') || id.includes('first')) return 's'
  if (id.includes('e-class') || id.includes('business')) return 'e'
  const code = (typeCode || '').toLowerCase()
  if (code === 'van' || code === 'van_xl') return 'v'
  if (code === 'premium' || code === 'first') return 's'
  return 'e'
}

function vehicleFromTokenChar(char: string): string | undefined {
  if (char === 'v') return 'mercedes-v-class'
  if (char === 's') return 'mercedes-s-class'
  if (char === 'e') return 'mercedes-e-class'
  return undefined
}

function serviceToTokenChar(serviceType?: BookingQuoteServiceType): string {
  if (serviceType === 'HOURLY_HIRE') return 'h'
  if (serviceType === 'AIRPORT_TRANSFER') return 'a'
  return 'c'
}

function serviceFromTokenChar(char: string): BookingQuoteServiceType {
  if (char === 'h') return 'HOURLY_HIRE'
  if (char === 'a') return 'AIRPORT_TRANSFER'
  return 'CITY_RIDE'
}

function formatDateForToken(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

function parseDateFromToken(raw: string): string | null {
  if (!/^\d{8}$/.test(raw)) return null
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

function formatTimeForToken(time: string): string {
  const [hh = '00', mm = '00'] = time.split(':')
  return `${hh.padStart(2, '0')}${mm.padStart(2, '0')}`
}

function parseTimeFromToken(raw: string): string | null {
  if (!/^\d{4}$/.test(raw)) return null
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`
}

function encodeCoordPair(lat?: number, lng?: number): string {
  if (!isValidCoord(lat, lng)) return ''
  return `${roundCoord(lat!)},${roundCoord(lng!)}`
}

function parseCoordPair(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null
  const [latStr, lngStr] = raw.split(',')
  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)
  if (!isValidCoord(lat, lng)) return null
  return { lat, lng }
}

function base64UrlEncode(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64url')
  }
  const b64 = btoa(
    encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
  )
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): string | null {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(input, 'base64url').toString('utf8')
    }
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    )
  } catch {
    return null
  }
}

/** Returns a compact token when pickup coords + date/time are present. */
export function encodeBookingQuoteToken(input: EncodeInput): string | null {
  if (!input.pickupDate?.trim() || !input.pickupTime?.trim()) return null

  const pickup = encodeCoordPair(input.pickupLat, input.pickupLng)
  if (!pickup) return null

  const serviceType = input.serviceType || 'CITY_RIDE'
  const isHourly = serviceType === 'HOURLY_HIRE'
  const dropoff = isHourly ? '' : encodeCoordPair(input.dropoffLat, input.dropoffLng)
  if (!isHourly && !dropoff) return null

  const payload = [
    TOKEN_VERSION,
    pickup,
    dropoff,
    formatDateForToken(input.pickupDate.trim()),
    formatTimeForToken(input.pickupTime.trim()),
    vehicleToTokenChar(input.vehicleId, input.vehicleTypeCode),
    serviceToTokenChar(serviceType),
  ].join('|')

  return base64UrlEncode(payload)
}

export function decodeBookingQuoteToken(token: string): DecodedBookingQuoteToken | null {
  const raw = base64UrlDecode(token.trim())
  if (!raw) return null

  const parts = raw.split('|')
  if (parts.length !== 7 || parts[0] !== TOKEN_VERSION) return null

  const pickup = parseCoordPair(parts[1]!)
  const pickupDate = parseDateFromToken(parts[3]!)
  const pickupTime = parseTimeFromToken(parts[4]!)
  if (!pickup || !pickupDate || !pickupTime) return null

  const serviceType = serviceFromTokenChar(parts[6]!)
  const dropoff = parseCoordPair(parts[2]!)
  if (serviceType !== 'HOURLY_HIRE' && !dropoff) return null

  return {
    pickupLat: pickup.lat,
    pickupLng: pickup.lng,
    dropoffLat: dropoff?.lat,
    dropoffLng: dropoff?.lng,
    pickupDate,
    pickupTime,
    vehicleId: vehicleFromTokenChar(parts[5]!),
    serviceType,
  }
}

export function decodedQuoteTokenToSearchParams(decoded: DecodedBookingQuoteToken): URLSearchParams {
  const params = new URLSearchParams()
  params.set('pickupLat', String(decoded.pickupLat))
  params.set('pickupLng', String(decoded.pickupLng))
  if (decoded.dropoffLat != null && decoded.dropoffLng != null) {
    params.set('dropoffLat', String(decoded.dropoffLat))
    params.set('dropoffLng', String(decoded.dropoffLng))
  }
  params.set('date', decoded.pickupDate)
  params.set('time', decoded.pickupTime)
  if (decoded.vehicleId) params.set('vehicle', decoded.vehicleId)
  const service =
    decoded.serviceType === 'HOURLY_HIRE'
      ? 'hourly'
      : decoded.serviceType === 'AIRPORT_TRANSFER'
        ? 'airport'
        : 'city'
  params.set('service', service)
  return params
}
