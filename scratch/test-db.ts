
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

async function test() {
  const connectionString = "postgresql://neondb_owner:npg_Rmf9e8qACHTi@ep-cold-mountain-agf66giq-pooler.c-2.eu-central-1.aws.neon.tech/nicetaxilimo?sslmode=require"
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const count = await prisma.booking.count()
    console.log('Total bookings count:', count)
    
    const bookings = await prisma.booking.findMany({
      take: 5,
      include: {
        vehicleType: true
      }
    })
    console.log('First 5 bookings:', JSON.stringify(bookings, null, 2))
  } catch (error) {
    console.error('Test error:', error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

test()
