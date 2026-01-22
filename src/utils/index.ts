// Shared utilities

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

// Calculate trip price (TTC - Total with service fee)
export function calculateTripPrice(
  distance: number,
  perKmRate: number,
  minimumFare: number,
  basePrice: number = 0
): number {
  const priceHT = basePrice + distance * perKmRate
  const priceBeforeFee = Math.max(priceHT, minimumFare)

  // Add 5% service fee to get TTC
  const serviceFee = priceBeforeFee * 0.05
  const priceTTC = priceBeforeFee + serviceFee

  return Math.round(priceTTC * 100) / 100 // Round to 2 decimal places
}

