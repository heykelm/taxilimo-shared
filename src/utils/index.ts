// Shared utilities

import type { PricingTier } from '../types'

// Generate booking number
export function generateBookingNumber(prefix: string = "BK"): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  // Increased from 100k to 1M combinations per day = virtually no collisions
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `${prefix}${year}${month}${day}-${random}` // BK20251211-123456
}

const SERVICE_FEE_RATE = 0.05

function applyServiceFee(priceBeforeFee: number, serviceFeeRate: number = SERVICE_FEE_RATE): number {
  const priceTTC = priceBeforeFee + priceBeforeFee * serviceFeeRate
  return Math.round(priceTTC * 100) / 100 // Round to 2 decimal places
}

function selectTierPrice(distance: number, tiers: PricingTier[]): number | null {
  const matchingTiers = tiers.filter((tier) => distance >= tier.minKm && distance <= tier.maxKm)
  if (matchingTiers.length === 0) {
    return null
  }

  const sorted = [...matchingTiers].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.minKm - b.minKm
  })

  return sorted[0].price
}

export interface PriceCalculationParams {
  distance: number
  serviceType: 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'
  basePrice: number
  pricePerKm: number
  minimumFare: number
  perHourRate?: number
  durationHours?: number
  aboveMaxKmBasePrice?: number
  aboveMaxKmPerKm?: number
  pricingTiers?: PricingTier[] | null
  serviceTypeMultiplier?: number
  serviceFeeRate?: number
  aboveMaxKmThreshold?: number
}

export type TripType = 'ONE_WAY' | 'ROUND_TRIP' | 'RETURN_NEW_RIDE' | 'HOURLY'

export interface TripTypePricingInput {
  tripType: TripType
  oneWay: {
    basePrice: number
    distanceCharge: number
    subtotal: number
  }
  returnWay?: {
    basePrice: number
    distanceCharge: number
    subtotal: number
  }
  serviceFeeRate?: number
}

export interface TripTypePricingOutput {
  basePrice: number
  distanceCharge: number
  subtotal: number
  serviceFee: number
  total: number
}

export interface BookingEstimatedPriceInput {
  distance?: number | null
  returnDistance?: number | null
  serviceType: 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'
  tripType: TripType
  basePrice: number
  pricePerKm: number
  minimumFare: number
  perHourRate?: number
  durationHours?: number
  aboveMaxKmBasePrice?: number
  aboveMaxKmPerKm?: number
  pricingTiers?: PricingTier[] | null
  serviceTypeMultiplier?: number
  serviceFeeRate?: number
  aboveMaxKmThreshold?: number
}

function roundPrice(amount: number): number {
  return Math.round(amount * 100) / 100
}

export function applyTripTypePricing(input: TripTypePricingInput): TripTypePricingOutput {
  const serviceFeeRate = input.serviceFeeRate ?? SERVICE_FEE_RATE

  if (input.tripType === 'HOURLY') {
    input = { ...input, tripType: 'ONE_WAY' }
  }

  if (input.tripType === 'ROUND_TRIP') {
    const basePrice = input.oneWay.basePrice * 2
    const distanceCharge = input.oneWay.distanceCharge * 2
    const subtotal = input.oneWay.subtotal * 2
    const serviceFee = subtotal * serviceFeeRate
    const total = subtotal + serviceFee

    return { basePrice, distanceCharge, subtotal, serviceFee, total }
  }

  if (input.tripType === 'RETURN_NEW_RIDE' && input.returnWay) {
    const basePrice = input.oneWay.basePrice + input.returnWay.basePrice
    const distanceCharge = input.oneWay.distanceCharge + input.returnWay.distanceCharge
    const subtotal = input.oneWay.subtotal + input.returnWay.subtotal
    const serviceFee = subtotal * serviceFeeRate
    const total = subtotal + serviceFee

    return { basePrice, distanceCharge, subtotal, serviceFee, total }
  }

  const subtotal = input.oneWay.subtotal
  const serviceFee = subtotal * serviceFeeRate
  const total = subtotal + serviceFee

  return {
    basePrice: input.oneWay.basePrice,
    distanceCharge: input.oneWay.distanceCharge,
    subtotal,
    serviceFee,
    total,
  }
}

export function calculateBookingEstimatedPrice(input: BookingEstimatedPriceInput): number {
  const {
    distance,
    returnDistance,
    serviceType,
    tripType,
    basePrice,
    pricePerKm,
    minimumFare,
    perHourRate,
    durationHours,
    aboveMaxKmBasePrice,
    aboveMaxKmPerKm,
    pricingTiers,
    serviceTypeMultiplier,
    serviceFeeRate,
    aboveMaxKmThreshold,
  } = input

  const oneWayTotal = calculatePrice({
    distance: distance ?? 0,
    serviceType,
    basePrice,
    pricePerKm,
    minimumFare,
    perHourRate,
    durationHours,
    aboveMaxKmBasePrice,
    aboveMaxKmPerKm,
    pricingTiers,
    serviceTypeMultiplier,
    serviceFeeRate,
    aboveMaxKmThreshold,
  })

  if (tripType === 'ROUND_TRIP') {
    return roundPrice(oneWayTotal * 2)
  }

  if (tripType === 'RETURN_NEW_RIDE' && typeof returnDistance === 'number') {
    const returnTotal = calculatePrice({
      distance: returnDistance,
      serviceType,
      basePrice,
      pricePerKm,
      minimumFare,
      perHourRate,
      durationHours,
      aboveMaxKmBasePrice,
      aboveMaxKmPerKm,
      pricingTiers,
      serviceTypeMultiplier,
      serviceFeeRate,
      aboveMaxKmThreshold,
    })
    return roundPrice(oneWayTotal + returnTotal)
  }

  return roundPrice(oneWayTotal)
}

// Calculate trip price (TTC - Total with service fee)
export function calculateTripPrice(
  distance: number,
  perKmRate: number,
  minimumFare: number,
  basePrice: number = 0
): number {
  const priceHT = basePrice + distance * perKmRate
  const priceBeforeFee = Math.max(priceHT, minimumFare)
  return applyServiceFee(priceBeforeFee)
}

// Calculate trip price using tiers/legacy rules with shared behavior
export function calculatePrice(params: PriceCalculationParams): number {
  const {
    distance,
    serviceType,
    basePrice,
    pricePerKm,
    minimumFare,
    perHourRate,
    durationHours,
    aboveMaxKmBasePrice,
    aboveMaxKmPerKm,
    pricingTiers,
    serviceTypeMultiplier,
    serviceFeeRate,
    aboveMaxKmThreshold,
  } = params

  let priceHT = 0

  if (serviceType === 'HOURLY_HIRE') {
    const hours = durationHours ?? 0
    const hourlyRate = perHourRate ?? 0
    priceHT = hourlyRate * hours
  } else {
    const tierPrice = pricingTiers ? selectTierPrice(distance, pricingTiers) : null
    if (tierPrice !== null) {
      priceHT = tierPrice
    } else if (
      aboveMaxKmBasePrice !== undefined &&
      aboveMaxKmPerKm !== undefined &&
      distance > (aboveMaxKmThreshold ?? 80)
    ) {
      priceHT = aboveMaxKmBasePrice + (distance - (aboveMaxKmThreshold ?? 80)) * aboveMaxKmPerKm
    } else {
      priceHT = basePrice + distance * pricePerKm
    }
  }

  const priceBeforeFee = Math.max(priceHT, minimumFare)
  const priceWithMultiplier = priceBeforeFee * (serviceTypeMultiplier ?? 1)
  return applyServiceFee(priceWithMultiplier, serviceFeeRate)
}

// Calculate trip price using pricing tiers with fallback to formula
export function calculateTripPriceWithTiers(
  distance: number,
  perKmRate: number,
  minimumFare: number,
  basePrice: number = 0,
  pricingTiers?: PricingTier[] | null
): number {
  if (pricingTiers && pricingTiers.length > 0) {
    const tierPrice = selectTierPrice(distance, pricingTiers)
    if (tierPrice !== null) {
      const priceBeforeFee = Math.max(tierPrice, minimumFare)
      return applyServiceFee(priceBeforeFee)
    }
  }

  return calculateTripPrice(distance, perKmRate, minimumFare, basePrice)
}

