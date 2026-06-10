/**
 * Message devis copier-coller (WhatsApp / email) + lien court /r/q/…
 * Utilisé par blacklimousinetransfers.com et nicetaxilimo.com.
 */

import { encodeBookingQuoteToken } from './booking-quote-token'

export type BookingQuoteLang = 'fr' | 'en'

export type BookingQuoteServiceType = 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'

export type BookingQuoteLocation = {
  address: string
  lat?: number
  lng?: number
} | null

export type BookingQuoteVehicle = {
  id?: string
  typeCode?: string | null
  name?: string
} | null

export type BuildBookingQuoteInput = {
  serviceType: BookingQuoteServiceType
  pickupLocation?: BookingQuoteLocation
  dropoffLocation?: BookingQuoteLocation
  pickupDate?: string
  pickupTime?: string
  passengers?: number
  adults?: number
  children?: number
  selectedVehicle?: BookingQuoteVehicle
  pricingTotal?: number | null
  priceEur?: number | null
  vehicleLabel?: string | null
  /** ex. https://blacklimousinetransfers.com */
  siteOrigin?: string
  lang?: BookingQuoteLang
}

/** Ville / lieu public — pas de rue ni numéro. */
export function toPublicAreaForQuote(fullAddress: string): string {
  if (!fullAddress?.trim()) return ''

  const addressLower = fullAddress.toLowerCase()

  if (addressLower.includes('aéroport') || addressLower.includes('airport')) {
    if (addressLower.includes('nice')) return 'Nice (Aéroport)'
    if (addressLower.includes('cannes') || addressLower.includes('mandelieu')) {
      return 'Cannes-Mandelieu (Aéroport)'
    }
    return 'Aéroport'
  }

  if (addressLower.includes('gare')) {
    if (addressLower.includes('nice')) return 'Nice (Gare)'
    if (addressLower.includes('monaco')) return 'Monaco (Gare)'
    if (addressLower.includes('cannes')) return 'Cannes (Gare)'
    return 'Gare'
  }

  const knownCities = [
    'Monaco',
    'Nice',
    'Cannes',
    'Antibes',
    'Menton',
    'Grasse',
    'Èze',
    'Eze',
    'Beaulieu-sur-Mer',
    'Saint-Jean-Cap-Ferrat',
    'Villefranche-sur-Mer',
    'Mandelieu',
    'Saint-Tropez',
  ]

  for (const city of knownCities) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(fullAddress)) {
      return city === 'Eze' ? 'Èze' : city
    }
  }

  const segments = fullAddress.split(',').map((s) => s.trim()).filter(Boolean)
  if (segments.length > 0) {
    let idx = segments.length - 1
    const lastLower = segments[idx]!.toLowerCase()
    if ((lastLower === 'france' || lastLower === 'monaco') && segments.length > 1) idx--

    const segment = segments[idx]!.replace(/\b\d{5}(-\d{4})?\b/g, '').trim()
    if (segment) {
      return segment.length > 36 ? `${segment.slice(0, 33)}…` : segment
    }
  }

  return 'Riviera'
}

export function vehicleLabelForQuote(
  typeCode?: string | null,
  vehicleId?: string | null,
  vehicleName?: string | null
): string {
  const t = `${typeCode || ''} ${vehicleId || ''}`.toLowerCase()
  if (
    t.includes('business') ||
    t.includes('e-class') ||
    t.includes('e_class') ||
    t.includes('berline')
  ) {
    return 'Berline (E)'
  }
  if (t.includes('van') || t.includes('v-class') || t.includes('v_class')) {
    return 'Van (V)'
  }
  if (
    t.includes('premium') ||
    t.includes('first') ||
    t.includes('s-class') ||
    t.includes('s_class') ||
    t.includes('luxe')
  ) {
    return 'Luxe (S)'
  }

  const name = (vehicleName || '').toLowerCase()
  if (name.includes('v-class') || name.includes('van')) return 'Van (V)'
  if (name.includes('s-class') || name.includes('luxe') || name.includes('premium')) return 'Luxe (S)'
  if (name.includes('e-class') || name.includes('berline') || name.includes('business')) {
    return 'Berline (E)'
  }
  if (vehicleName?.trim()) return vehicleName.trim()
  return 'Berline (E)'
}

export function formatQuoteDateTime(
  pickupDate: string,
  pickupTime: string,
  lang: BookingQuoteLang = 'fr'
): string {
  if (!pickupDate) return pickupTime || ''
  try {
    const [y, m, d] = pickupDate.split('-').map(Number)
    const [hh, mm] = (pickupTime || '00:00').split(':').map(Number)
    const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0)
    const datePart = dt.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
    })
    const timePart =
      (pickupTime || '').trim() ||
      dt.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    return timePart ? `${datePart}, ${timePart}` : datePart
  } catch {
    return [pickupDate, pickupTime].filter(Boolean).join(' ')
  }
}

function serviceTypeToQuery(serviceType: BookingQuoteServiceType): string {
  if (serviceType === 'HOURLY_HIRE') return 'hourly'
  if (serviceType === 'AIRPORT_TRANSFER') return 'airport'
  return 'city'
}

/** ID véhicule pour l’URL (mercedes-e-class ou alias business/van/premium). */
export function vehicleIdForQuoteUrl(
  vehicleId?: string | null,
  typeCode?: string | null
): string | undefined {
  const id = (vehicleId || '').toLowerCase()
  if (id.includes('mercedes') || id.includes('van') || id.includes('class')) return vehicleId!
  const code = (typeCode || id || '').toLowerCase()
  if (code === 'van' || code === 'van_xl') return 'mercedes-v-class'
  if (code === 'premium' || code === 'first') return 'mercedes-s-class'
  if (code === 'business') return 'mercedes-e-class'
  return vehicleId || typeCode || undefined
}

function isValidQuoteCoord(lat?: number, lng?: number): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  )
}

export function parseQuoteCoordParam(value: string | null | undefined): number | undefined {
  if (value == null || value === '') return undefined
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : undefined
}

/** Restore pickup/dropoff from /r or /booking query (address + optional lat/lng). */
export function quoteLocationFromPrefill(
  address: string | null | undefined,
  latStr: string | null | undefined,
  lngStr: string | null | undefined
): { address: string; lat: number; lng: number } | null {
  const lat = parseQuoteCoordParam(latStr)
  const lng = parseQuoteCoordParam(lngStr)
  const trimmed = address?.trim()
  if (isValidQuoteCoord(lat, lng)) {
    return { address: trimmed || '', lat: lat!, lng: lng! }
  }
  if (!trimmed) return null
  return { address: trimmed, lat: 0, lng: 0 }
}

export function buildBookingQuoteUrl(input: {
  pickupAddress?: string
  dropoffAddress?: string
  pickupLat?: number
  pickupLng?: number
  dropoffLat?: number
  dropoffLng?: number
  pickupDate?: string
  pickupTime?: string
  vehicleTypeCode?: string
  vehicleId?: string
  serviceType?: BookingQuoteServiceType
  siteOrigin?: string
}): string {
  const origin = (input.siteOrigin || 'https://blacklimousinetransfers.com').replace(/\/$/, '')
  const token = encodeBookingQuoteToken(input)
  if (token) return `${origin}/r/q/${token}`

  const params = new URLSearchParams()
  if (input.pickupAddress?.trim()) params.set('pickup', input.pickupAddress.trim())
  if (input.dropoffAddress?.trim()) params.set('dropoff', input.dropoffAddress.trim())
  if (isValidQuoteCoord(input.pickupLat, input.pickupLng)) {
    params.set('pickupLat', String(input.pickupLat))
    params.set('pickupLng', String(input.pickupLng))
  }
  if (isValidQuoteCoord(input.dropoffLat, input.dropoffLng)) {
    params.set('dropoffLat', String(input.dropoffLat))
    params.set('dropoffLng', String(input.dropoffLng))
  }
  if (input.pickupDate?.trim()) params.set('date', input.pickupDate.trim())
  if (input.pickupTime?.trim()) params.set('time', input.pickupTime.trim())
  const vehicle = vehicleIdForQuoteUrl(input.vehicleId, input.vehicleTypeCode)
  if (vehicle?.trim()) params.set('vehicle', vehicle.trim())
  params.set('service', serviceTypeToQuery(input.serviceType || 'CITY_RIDE'))
  const qs = params.toString()
  return qs ? `${origin}/r?${qs}` : `${origin}/r`
}

export function buildBookingQuoteMessage(input: BuildBookingQuoteInput): string | null {
  const lang = input.lang ?? 'fr'
  const pickupRaw = input.pickupLocation?.address?.trim() || ''
  if (!pickupRaw) return null

  const isHourly = input.serviceType === 'HOURLY_HIRE'
  const dropRaw = input.dropoffLocation?.address?.trim() || ''
  const pickupArea = toPublicAreaForQuote(pickupRaw)
  const dropoffArea = dropRaw ? toPublicAreaForQuote(dropRaw) : ''

  const routeLine = isHourly
    ? `📍 ${pickupArea} · ${lang === 'en' ? 'Hourly hire' : 'Mise à disposition'}`
    : dropoffArea
      ? `📍 ${pickupArea} → ${dropoffArea}`
      : `📍 ${pickupArea}`

  const dateLine =
    input.pickupDate || input.pickupTime
      ? `📅 ${formatQuoteDateTime(input.pickupDate || '', input.pickupTime || '', lang)}`
      : ''

  const vehicle = vehicleLabelForQuote(
    input.selectedVehicle?.typeCode,
    input.selectedVehicle?.id,
    input.vehicleLabel ?? input.selectedVehicle?.name
  )

  const pax =
    input.serviceType === 'HOURLY_HIRE'
      ? (input.adults || 1) + (input.children || 0)
      : input.passengers || 1

  const metaLine = `${vehicle} · ${pax} pax`

  const price =
    input.priceEur ??
    (input.pricingTotal != null ? Number(input.pricingTotal) : null)

  const priceLine =
    price != null && Number.isFinite(price) && price > 0
      ? `💰 ${Math.round(price)}€ · com. incl.`
      : ''

  const link = buildBookingQuoteUrl({
    pickupAddress: pickupRaw,
    dropoffAddress: isHourly ? undefined : dropRaw || undefined,
    pickupLat: input.pickupLocation?.lat,
    pickupLng: input.pickupLocation?.lng,
    dropoffLat: input.dropoffLocation?.lat,
    dropoffLng: input.dropoffLocation?.lng,
    pickupDate: input.pickupDate,
    pickupTime: input.pickupTime,
    vehicleTypeCode: input.selectedVehicle?.typeCode || undefined,
    vehicleId: input.selectedVehicle?.id,
    serviceType: input.serviceType,
    siteOrigin: input.siteOrigin,
  })

  const linkLine =
    lang === 'en' ? `👉 Book online:\n${link}` : `👉 Réserver en ligne :\n${link}`

  return [routeLine, dateLine, metaLine, priceLine, linkLine].filter(Boolean).join('\n')
}

export async function copyBookingQuoteMessage(message: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(message)
    return true
  } catch {
    return false
  }
}
