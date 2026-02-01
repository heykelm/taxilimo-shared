import { describe, it, expect } from 'vitest'
import {
  PRICING_TIER_DEFAULTS,
  PRICING_TIER_DEFAULTS_MONACO,
  isPickupFromMonaco,
  getMonacoPricingForVehicle,
  toPricingTiers,
} from './pricing-defaults'
import { calculateBookingEstimatedPrice } from './utils'

const toTiers = (config: { tiers: { minKm: number; maxKm: number; price: number; sortOrder: number }[]; vehicleTypeId: string }) =>
  toPricingTiers(config.tiers, config.vehicleTypeId)

describe('Monaco pricing', () => {
  describe('isPickupFromMonaco', () => {
    it('détecte Monaco dans pickupLocation', () => {
      expect(isPickupFromMonaco('Monaco', null)).toBe(true)
      expect(isPickupFromMonaco('Place du Casino, Monaco', null)).toBe(true)
      expect(isPickupFromMonaco('MC 98000', null)).toBe(true)
    })

    it('détecte Monaco dans pickupAddress', () => {
      expect(isPickupFromMonaco(null, 'Monaco, France')).toBe(true)
      expect(isPickupFromMonaco(null, '06230 Villefranche-sur-Mer')).toBe(false)
    })

    it('retourne false pour non-Monaco', () => {
      expect(isPickupFromMonaco('Nice', 'France')).toBe(false)
      expect(isPickupFromMonaco('Cannes', null)).toBe(false)
    })
  })

  describe('getMonacoPricingForVehicle', () => {
    it('retourne E-Class pour mercedes-e-class', () => {
      const m = getMonacoPricingForVehicle('mercedes-e-class')
      expect(m.aboveMaxKmBasePrice).toBe(230)
      expect(m.aboveMaxKmPerKm).toBe(2.5)
      expect(m.minimumFare).toBe(90)
      expect(m.tiers[0].price).toBe(90)
    })

    it('retourne V-Class pour mercedes-v-class', () => {
      const m = getMonacoPricingForVehicle('mercedes-v-class')
      expect(m.aboveMaxKmBasePrice).toBe(230)
      expect(m.aboveMaxKmPerKm).toBe(3.0)
      expect(m.minimumFare).toBe(110)
      expect(m.tiers[0].price).toBe(110)
    })
  })

  describe('calculs Monaco vs standard', () => {
    const baseInput = {
      serviceType: 'CITY_RIDE' as const,
      tripType: 'ONE_WAY' as const,
      basePrice: 0,
      pricePerKm: 2.5,
      perHourRate: undefined,
      durationHours: undefined,
      serviceTypeMultiplier: undefined,
      serviceFeeRate: undefined,
      aboveMaxKmThreshold: undefined,
    }

    it('Monaco → Nice 20.6 km: E 89.25 → 94.50, V 115.50 → 115.50', () => {
      const dist = 20.6
      const eStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 55,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.eClass),
      })
      const eMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 90,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS_MONACO.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS_MONACO.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.eClass),
      })
      const vStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 75,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.vClass),
      })
      const vMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 110,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS_MONACO.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS_MONACO.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.vClass),
      })
      expect(eStandard).toBe(89.25)
      expect(eMonaco).toBe(94.5)
      expect(vStandard).toBe(115.5)
      expect(vMonaco).toBe(115.5)
    })

    it('Monaco → Villefranche 16.3 km: E 89.25 → 94.50, V 115.50 → 115.50', () => {
      const dist = 16.3
      const eStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 55,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.eClass),
      })
      const eMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 90,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS_MONACO.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS_MONACO.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.eClass),
      })
      const vStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 75,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.vClass),
      })
      const vMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 110,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS_MONACO.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS_MONACO.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.vClass),
      })
      expect(eStandard).toBe(89.25)
      expect(eMonaco).toBe(94.5)
      expect(vStandard).toBe(115.5)
      expect(vMonaco).toBe(115.5)
    })

    it('Monaco → Cap-d\'Ail 3.1 km: E 57.75 → 94.50, V 78.75 → 115.50', () => {
      const dist = 3.1
      const eStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 55,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.eClass),
      })
      const eMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 90,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS_MONACO.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS_MONACO.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.eClass),
      })
      const vStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 75,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.vClass),
      })
      const vMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 110,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS_MONACO.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS_MONACO.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.vClass),
      })
      expect(eStandard).toBe(57.75)
      expect(eMonaco).toBe(94.5)
      expect(vStandard).toBe(78.75)
      expect(vMonaco).toBe(115.5)
    })

    it('Nice → Cannes 33.1 km (grille standard uniquement)', () => {
      const dist = 33.1
      const eStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 55,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.eClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.eClass),
      })
      const vStandard = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 75,
        aboveMaxKmBasePrice: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmBasePrice,
        aboveMaxKmPerKm: PRICING_TIER_DEFAULTS.vClass.aboveMaxKmPerKm,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS.vClass),
      })
      expect(eStandard).toBe(110.25)
      expect(vStandard).toBe(136.5)
    })

    it('Au-delà de 80 km: Monaco E 230 + 2.5/km, V 230 + 3/km', () => {
      const dist = 100
      const eMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 90,
        aboveMaxKmBasePrice: 230,
        aboveMaxKmPerKm: 2.5,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.eClass),
      })
      const vMonaco = calculateBookingEstimatedPrice({
        ...baseInput,
        distance: dist,
        returnDistance: null,
        minimumFare: 110,
        aboveMaxKmBasePrice: 230,
        aboveMaxKmPerKm: 3.0,
        pricingTiers: toTiers(PRICING_TIER_DEFAULTS_MONACO.vClass),
      })
      // E: 230 + (100-80)*2.5 = 230 + 50 = 280 HT → 294 TTC
      // V: 230 + (100-80)*3 = 230 + 60 = 290 HT → 304.50 TTC
      expect(eMonaco).toBe(294)
      expect(vMonaco).toBe(304.5)
    })
  })
})
