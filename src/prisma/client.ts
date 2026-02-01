// Prisma Client singleton for shared package
import { PrismaClient } from '@prisma/client'

// Prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaSingleton: PrismaClient | undefined = globalForPrisma.prisma

function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaSingleton
    }
  }

  return prismaSingleton
}

// Lazy proxy to avoid Prisma initialization during module evaluation
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === 'then') return undefined
    return getPrismaClient()[prop as keyof PrismaClient]
  },
}) as PrismaClient

