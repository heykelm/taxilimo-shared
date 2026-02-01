import { z } from 'zod'

export const createBookingSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  customerEmail: z.string().email('Invalid email address').toLowerCase(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format'),
  customerAddress: z.string().max(500).trim().optional(),
  vehicleTypeId: z.string().min(1, 'Vehicle type ID is required'),
  serviceType: z.enum(['CITY_RIDE', 'AIRPORT_TRANSFER', 'HOURLY_HIRE']),
  tripType: z.enum(['ONE_WAY', 'ROUND_TRIP', 'HOURLY', 'RETURN_NEW_RIDE']),
  pickupLocation: z.string().min(3).max(200).trim(),
  pickupAddress: z.string().min(3).max(500).trim(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  pickupDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)), // ISO date or date string
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  dropoffLocation: z.union([z.string().min(3).max(200).trim(), z.null()]).optional(),
  dropoffAddress: z.union([z.string().min(3).max(500).trim(), z.null()]).optional(),
  dropoffLat: z.number().min(-90).max(90).optional(),
  dropoffLng: z.number().min(-180).max(180).optional(),
  dropoffDate: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()]).optional(),
  dropoffTime: z.union([z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), z.null()]).optional(),
  distance: z.number().min(0).max(10000).optional(), // Max 10,000 km
  duration: z.number().min(0).max(86400).optional(), // Max 24 hours in minutes
  returnDistance: z.union([z.number().min(0).max(10000), z.null()]).optional(),
  returnDuration: z.union([z.number().min(0).max(86400), z.null()]).optional(),
  passengers: z.number().int().min(1).max(50).default(1),
  luggage: z.number().int().min(0).max(100).default(0),
  adults: z.number().int().min(0).max(50).optional(),
  children: z.number().int().min(0).max(50).optional(),
  durationHours: z.number().int().min(3).max(24).optional(),
  agreedToTerms: z.boolean().optional(),
  flightNumber: z.union([z.string().max(20).trim(), z.null()]).optional(),
  specialRequests: z.union([z.string().max(1000).trim(), z.null()]).optional(),
  notes: z.union([z.string().max(1000).trim(), z.null()]).optional(),
  language: z.enum(['en', 'fr']).default('fr'),
  paymentMethod: z.enum(['stripe', 'paypal', 'cash', 'card', 'bank_transfer']).optional(),
  promoCode: z.union([z.string().max(50).trim().toUpperCase(), z.null()]).optional(),
  estimatedPrice: z.number().min(0).optional(),
  depositAmount: z.union([z.number().min(0), z.null()]).optional(),
  requiresDeposit: z.boolean().optional(),
  discountAmount: z.union([z.number().min(0), z.null()]).optional(),
  discountPercent: z.union([z.number().min(0).max(100), z.null()]).optional(),
}).refine(
  (data) => {
    // Hourly hire requires durationHours and agreedToTerms
    if (data.serviceType === 'HOURLY_HIRE') {
      return !!data.durationHours && !!data.agreedToTerms
    }
    // Other types require dropoff (must be non-null strings)
    return (
      !!(data.dropoffLocation && typeof data.dropoffLocation === 'string' && data.dropoffLocation.trim()) &&
      !!(data.dropoffAddress && typeof data.dropoffAddress === 'string' && data.dropoffAddress.trim())
    )
  },
  {
    message: 'Invalid service type configuration',
    path: ['dropoffLocation'], // Point to the field that failed
  }
).transform((data) => {
  // Transform empty strings to null for optional fields and handle null values
  return {
    ...data,
    dropoffLocation:
      data.dropoffLocation && typeof data.dropoffLocation === 'string' && data.dropoffLocation.trim()
        ? data.dropoffLocation.trim()
        : null,
    dropoffAddress:
      data.dropoffAddress && typeof data.dropoffAddress === 'string' && data.dropoffAddress.trim()
        ? data.dropoffAddress.trim()
        : null,
    dropoffDate:
      data.dropoffDate && typeof data.dropoffDate === 'string' && data.dropoffDate.trim()
        ? data.dropoffDate.trim()
        : null,
    dropoffTime:
      data.dropoffTime && typeof data.dropoffTime === 'string' && data.dropoffTime.trim()
        ? data.dropoffTime.trim()
        : null,
    customerAddress:
      data.customerAddress && typeof data.customerAddress === 'string' && data.customerAddress.trim()
        ? data.customerAddress.trim()
        : null,
    flightNumber:
      data.flightNumber && typeof data.flightNumber === 'string' && data.flightNumber.trim()
        ? data.flightNumber.trim()
        : null,
    specialRequests:
      data.specialRequests && typeof data.specialRequests === 'string' && data.specialRequests.trim()
        ? data.specialRequests.trim()
        : null,
    notes: data.notes && typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null,
    promoCode:
      data.promoCode && typeof data.promoCode === 'string' && data.promoCode.trim()
        ? data.promoCode.trim().toUpperCase()
        : null,
    discountAmount: data.discountAmount ?? null,
    discountPercent: data.discountPercent ?? null,
    depositAmount: data.depositAmount ?? null,
    requiresDeposit: data.requiresDeposit ?? undefined,
    returnDistance: data.returnDistance ?? null,
    returnDuration: data.returnDuration ?? null,
  }
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>

