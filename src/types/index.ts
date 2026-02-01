// Shared TypeScript types
// These types are used across all services (frontend, backend, whatsapp-bot)

export interface Booking {
  id: string
  bookingNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  vehicleTypeId: string
  serviceType: 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'
  tripType: 'ONE_WAY' | 'ROUND_TRIP' | 'HOURLY' | 'RETURN_NEW_RIDE'
  pickupLocation: string
  pickupAddress: string
  pickupDate: Date
  pickupTime: string
  dropoffLocation?: string
  dropoffAddress?: string
  distance?: number
  duration?: number
  estimatedPrice: number
  finalPrice?: number
  promoCode?: string
  discountAmount?: number
  discountPercent?: number
  depositAmount?: number
  depositPercent?: number
  requiresDeposit?: boolean
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  createdAt: Date
  updatedAt: Date
}

export interface Quote {
  id: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  pickupLocation: string
  pickupAddress: string
  dropoffLocation?: string
  dropoffAddress?: string
  pickupDate: Date
  pickupTime: string
  vehicleTypeId: string
  serviceType: 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'
  distance?: number
  calculatedPrice: number
  finalPrice?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED'
  createdAt: Date
  updatedAt: Date
}

export interface VehicleType {
  id: string
  name: string
  description: string
  capacity: number
  luggage: number
  basePrice: number
  pricePerKm: number
  minimumFare: number
  perKmRate: number
  perHourRate?: number
  aboveMaxKmBasePrice?: number
  aboveMaxKmPerKm?: number
}

export interface PricingTier {
  id: string
  vehicleTypeId: string
  minKm: number
  maxKm: number
  price: number
  sortOrder: number
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  createdAt: Date
  updatedAt: Date
}

// API Request/Response types
export interface CreateBookingRequest {
  customerName: string
  customerEmail: string
  customerPhone: string
  vehicleTypeId: string
  serviceType: 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'
  tripType?: 'ONE_WAY' | 'ROUND_TRIP' | 'HOURLY' | 'RETURN_NEW_RIDE'
  pickupLocation: string
  pickupAddress: string
  pickupLat?: number
  pickupLng?: number
  pickupDate: string
  pickupTime: string
  dropoffLocation?: string
  dropoffAddress?: string
  dropoffLat?: number
  dropoffLng?: number
  distance?: number
  duration?: number
  returnDistance?: number
  returnDuration?: number
  passengers?: number
  luggage?: number
  specialRequests?: string
  paymentMethod?: 'stripe' | 'paypal' | 'cash' | 'card' | 'bank_transfer'
  promoCode?: string
  discountAmount?: number
  discountPercent?: number
  depositAmount?: number
  requiresDeposit?: boolean
}

export interface CreateQuoteRequest {
  customerName: string
  customerPhone: string
  customerEmail?: string
  pickupLocation: string
  pickupAddress: string
  dropoffLocation?: string
  dropoffAddress?: string
  pickupDate: string
  pickupTime: string
  vehicleTypeId: string
  serviceType: 'CITY_RIDE' | 'AIRPORT_TRANSFER' | 'HOURLY_HIRE'
  distance?: number
  specialRequests?: string
}

