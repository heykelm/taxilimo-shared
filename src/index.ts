// Shared package exports
// This package contains types, Prisma client, and utilities shared across all services

// Export types
export * from './types'

// Export Prisma client
export { prisma } from './prisma/client'

// Re-export Prisma types
export type { Prisma } from '@prisma/client'

// Export utilities
export * from './utils'

// Export booking financials
export * from './booking-financials'

// Export validation utilities
export * from './validation'

// Export validations
export * from './validations/booking'

// Export pricing defaults
export * from './pricing-defaults'
