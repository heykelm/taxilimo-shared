import { describe, expect, it } from 'vitest'
import { calculateBookingEstimatedPrice } from './index'

const tiers = [
  { minKm: 0, maxKm: 4.99, price: 55 },
  { minKm: 5, maxKm: 14.99, price: 70 },
  { minKm: 15, maxKm: 24.99, price: 85 },
]

const baseInput = {
  distance: 11.971,
  serviceType: 'AIRPORT_TRANSFER' as const,
  basePrice: 0,
  pricePerKm: 2.2,
  minimumFare: 55,
  pricingTiers: tiers,
  aboveMaxKmBasePrice: 240,
  aboveMaxKmPerKm: 2,
}

describe('RETURN_NEW_RIDE pricing', () => {
  it('prices both legs when returnDistance is provided', () => {
    const withReturn = calculateBookingEstimatedPrice({
      ...baseInput,
      tripType: 'RETURN_NEW_RIDE',
      returnDistance: 11.971,
    })
    // Each leg 70 + 5% = 73.5 → 74 €; payable = 74 + 74 = 148 (not round(147)=147)
    expect(withReturn).toBe(148)
  })

  it('falls back to outbound distance when returnDistance is missing', () => {
    const oneWay = calculateBookingEstimatedPrice({
      ...baseInput,
      tripType: 'ONE_WAY',
      returnDistance: null,
    })
    const missingReturn = calculateBookingEstimatedPrice({
      ...baseInput,
      tripType: 'RETURN_NEW_RIDE',
      returnDistance: null,
    })
    expect(missingReturn).toBe(148)
    expect(missingReturn).toBe(oneWay * 2)
  })

  it('rounds ONE_WAY TTC to whole euros', () => {
    const oneWay = calculateBookingEstimatedPrice({
      ...baseInput,
      tripType: 'ONE_WAY',
      returnDistance: null,
    })
    // 70 + 5% = 73.5 → 74 €
    expect(oneWay).toBe(74)
  })
})
