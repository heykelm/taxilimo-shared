import type { PricingTier } from './types'

export type PricingTierDefault = {
  minKm: number
  maxKm: number
  price: number
  sortOrder: number
}

/** Convertit des defaults en PricingTier (avec id, vehicleTypeId). */
export function toPricingTiers(
  defaults: PricingTierDefault[],
  vehicleTypeId: string
): PricingTier[] {
  return defaults.map((t, i) => ({
    id: `tier-${vehicleTypeId}-${i}`,
    vehicleTypeId,
    minKm: t.minKm,
    maxKm: t.maxKm,
    price: t.price,
    sortOrder: t.sortOrder,
  }))
}

export const PRICING_TIER_DEFAULTS = {
  eClass: {
    vehicleTypeId: 'mercedes-e-class',
    aboveMaxKmBasePrice: 240,
    aboveMaxKmPerKm: 2.0,
    tiers: [
      { minKm: 0, maxKm: 4.99, price: 55, sortOrder: 1 },
      { minKm: 5, maxKm: 14.99, price: 70, sortOrder: 2 },
      { minKm: 15, maxKm: 24.99, price: 85, sortOrder: 3 },
      { minKm: 25, maxKm: 35.99, price: 105, sortOrder: 4 },
      { minKm: 36, maxKm: 44.99, price: 120, sortOrder: 5 },
      { minKm: 45, maxKm: 54.99, price: 155, sortOrder: 6 },
      { minKm: 55, maxKm: 64.99, price: 180, sortOrder: 7 },
      { minKm: 65, maxKm: 79.99, price: 210, sortOrder: 8 },
    ] as PricingTierDefault[],
  },
  vClass: {
    vehicleTypeId: 'mercedes-v-class',
    aboveMaxKmBasePrice: 270,
    aboveMaxKmPerKm: 2.5,
    tiers: [
      { minKm: 0, maxKm: 4.99, price: 75, sortOrder: 1 },
      { minKm: 5, maxKm: 14.99, price: 95, sortOrder: 2 },
      { minKm: 15, maxKm: 24.99, price: 110, sortOrder: 3 },
      { minKm: 25, maxKm: 35.99, price: 130, sortOrder: 4 },
      { minKm: 36, maxKm: 44.99, price: 150, sortOrder: 5 },
      { minKm: 45, maxKm: 54.99, price: 175, sortOrder: 6 },
      { minKm: 55, maxKm: 64.99, price: 200, sortOrder: 7 },
      { minKm: 65, maxKm: 79.99, price: 230, sortOrder: 8 },
    ] as PricingTierDefault[],
  },
} as const

/**
 * Monaco-specific pricing (départ de Monaco) – frais VTC supplémentaires.
 * Utilisé quand pickupLocation/pickupAddress indique un départ de Monaco.
 */
export const PRICING_TIER_DEFAULTS_MONACO = {
  eClass: {
    vehicleTypeId: 'mercedes-e-class',
    aboveMaxKmBasePrice: 230,
    aboveMaxKmPerKm: 2.5,
    tiers: [
      { minKm: 0, maxKm: 4.99, price: 90, sortOrder: 1 },
      { minKm: 5, maxKm: 14.99, price: 90, sortOrder: 2 },
      { minKm: 15, maxKm: 24.99, price: 90, sortOrder: 3 },
      { minKm: 25, maxKm: 35.99, price: 105, sortOrder: 4 },
      { minKm: 36, maxKm: 44.99, price: 120, sortOrder: 5 },
      { minKm: 45, maxKm: 54.99, price: 150, sortOrder: 6 },
      { minKm: 55, maxKm: 64.99, price: 180, sortOrder: 7 },
      { minKm: 65, maxKm: 79.99, price: 210, sortOrder: 8 },
    ] as PricingTierDefault[],
  },
  vClass: {
    vehicleTypeId: 'mercedes-v-class',
    aboveMaxKmBasePrice: 230,
    aboveMaxKmPerKm: 3.0,
    tiers: [
      { minKm: 0, maxKm: 4.99, price: 110, sortOrder: 1 },
      { minKm: 5, maxKm: 14.99, price: 110, sortOrder: 2 },
      { minKm: 15, maxKm: 24.99, price: 110, sortOrder: 3 },
      { minKm: 25, maxKm: 35.99, price: 130, sortOrder: 4 },
      { minKm: 36, maxKm: 44.99, price: 150, sortOrder: 5 },
      { minKm: 45, maxKm: 54.99, price: 175, sortOrder: 6 },
      { minKm: 55, maxKm: 64.99, price: 200, sortOrder: 7 },
      { minKm: 65, maxKm: 79.99, price: 230, sortOrder: 8 },
    ] as PricingTierDefault[],
  },
} as const

export type VehiclePricingVariant = 'eClass' | 'vClass'

/** Détecte si le lieu de prise en charge est Monaco (pour appliquer la grille Monaco). */
export function isPickupFromMonaco(
  pickupLocation?: string | null,
  pickupAddress?: string | null
): boolean {
  const text = [pickupLocation, pickupAddress].filter(Boolean).join(' ').toLowerCase()
  return /monaco|mc\s*\d{3}|98000/.test(text)
}

/** Retourne les tiers et tarifs au-delà de 80 km pour un départ Monaco, selon le véhicule. */
export function getMonacoPricingForVehicle(vehicleTypeId: string): {
  tiers: PricingTier[]
  aboveMaxKmBasePrice: number
  aboveMaxKmPerKm: number
  minimumFare: number
} {
  const id = (vehicleTypeId || '').toLowerCase()
  const config = id.includes('v-class') || id.includes('vclass')
    ? PRICING_TIER_DEFAULTS_MONACO.vClass
    : PRICING_TIER_DEFAULTS_MONACO.eClass
  const vtId = config.vehicleTypeId
  return {
    tiers: toPricingTiers(config.tiers, vtId),
    aboveMaxKmBasePrice: config.aboveMaxKmBasePrice,
    aboveMaxKmPerKm: config.aboveMaxKmPerKm,
    minimumFare: config.tiers[0]?.price ?? 90,
  }
}
