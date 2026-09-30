// Shared utilities

import type { PricingTier } from '../types'
import { resolvePricingAdjustment, type PricingAdjustmentRule } from './pricing-adjustment'

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

/** Customer-facing totals are whole euros (matches formatPrice / what the client pays). */
export function roundToEuro(amount: number): number {
  return Math.round(amount)
}

function applyServiceFee(priceBeforeFee: number, serviceFeeRate: number = SERVICE_FEE_RATE): number {
  const priceTTC = priceBeforeFee + priceBeforeFee * serviceFeeRate
  // Keep cent precision for intermediate legs; final payable total is rounded via roundToEuro.
  return Math.round(priceTTC * 100) / 100
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
  pickupDate?: string | Date | null
  pricingAdjustments?: PricingAdjustmentRule[] | null
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
  pickupDate?: string | Date | null
  returnLegPickupDate?: string | Date | null
  pricingAdjustments?: PricingAdjustmentRule[] | null
}

function roundPrice(amount: number): number {
  return roundToEuro(amount)
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
    const total = roundToEuro(subtotal + serviceFee)

    return { basePrice, distanceCharge, subtotal, serviceFee: roundToEuro(total - subtotal), total }
  }

  if (input.tripType === 'RETURN_NEW_RIDE' && input.returnWay) {
    const basePrice = input.oneWay.basePrice + input.returnWay.basePrice
    const distanceCharge = input.oneWay.distanceCharge + input.returnWay.distanceCharge
    const subtotal = input.oneWay.subtotal + input.returnWay.subtotal
    const serviceFee = subtotal * serviceFeeRate
    const total = roundToEuro(subtotal + serviceFee)

    return { basePrice, distanceCharge, subtotal, serviceFee: roundToEuro(total - subtotal), total }
  }

  const subtotal = input.oneWay.subtotal
  const serviceFee = subtotal * serviceFeeRate
  const total = roundToEuro(subtotal + serviceFee)

  return {
    basePrice: input.oneWay.basePrice,
    distanceCharge: input.oneWay.distanceCharge,
    subtotal,
    serviceFee: roundToEuro(total - subtotal),
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
    pickupDate,
    returnLegPickupDate,
    pricingAdjustments,
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
    pickupDate,
    pricingAdjustments,
  })

  if (tripType === 'ROUND_TRIP') {
    return roundPrice(oneWayTotal * 2)
  }

  // RETURN_NEW_RIDE = outbound + return. If returnDistance is missing (Maps lag /
  // client omit), fall back to outbound distance so we never undercharge as one-way.
  if (tripType === 'RETURN_NEW_RIDE') {
    const effectiveReturnDistance =
      typeof returnDistance === 'number' && Number.isFinite(returnDistance)
        ? returnDistance
        : typeof distance === 'number' && Number.isFinite(distance)
          ? distance
          : null

    if (effectiveReturnDistance != null) {
      const returnTotal = calculatePrice({
        distance: effectiveReturnDistance,
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
        pickupDate: returnLegPickupDate ?? pickupDate,
        pricingAdjustments,
      })
      return roundPrice(oneWayTotal + returnTotal)
    }
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
    pickupDate,
    pricingAdjustments,
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
  const eventMultiplier = resolvePricingAdjustment(serviceType, pickupDate, pricingAdjustments).multiplier
  const priceWithMultiplier = priceBeforeFee * (serviceTypeMultiplier ?? 1) * eventMultiplier
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

export * from './flight-tracker'
export * from './pricing-adjustment'
