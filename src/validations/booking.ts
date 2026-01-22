import { z } from 'zod'

export const createBookingSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  customerEmail: z.string().email('Invalid email address').toLowerCase(),
  customerPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format'),
  customerAddress: z.string().max(500).trim().optional(),
  vehicleTypeId: z.string().cuid('Invalid vehicle type ID'),
  serviceType: z.enum(['CITY_RIDE', 'AIRPORT_TRANSFER', 'HOURLY_HIRE']),
  tripType: z.enum(['ONE_WAY', 'ROUND_TRIP', 'HOURLY', 'RETURN_NEW_RIDE']),
  pickupLocation: z.string().min(3).max(200).trim(),
  pickupAddress: z.string().min(3).max(500).trim(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  pickupDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  dropoffLocation: z.string().min(3).max(200).trim().optional(),
  dropoffAddress: z.string().min(3).max(500).trim().optional(),
  dropoffLat: z.number().min(-90).max(90).optional(),
  dropoffLng: z.number().min(-180).max(180).optional(),
  dropoffDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  dropoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  distance: z.number().min(0).max(10000).optional(),
  duration: z.number().min(0).max(86400).optional(),
  passengers: z.number().int().min(1).max(50).default(1),
  luggage: z.number().int().min(0).max(100).default(0),
  adults: z.number().int().min(0).max(50).optional(),
  children: z.number().int().min(0).max(50).optional(),
  durationHours: z.number().int().min(1).max(24).optional(),
  agreedToTerms: z.boolean().optional(),
  flightNumber: z.string().max(20).trim().optional(),
  specialRequests: z.string().max(1000).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
  language: z.enum(['en', 'fr']).default('fr'),
  paymentMethod: z.enum(['stripe', 'cash', 'card', 'bank_transfer']).optional(),
  promoCode: z.string().max(50).trim().toUpperCase().optional(),
  estimatedPrice: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
}).refine(
  (data) => {
    if (data.serviceType === 'HOURLY_HIRE') {
      return !!data.durationHours && !!data.agreedToTerms
    }
    return !!data.dropoffLocation && !!data.dropoffAddress
  },
  { message: 'Invalid service type configuration' }
)

export type CreateBookingInput = z.infer<typeof createBookingSchema>

