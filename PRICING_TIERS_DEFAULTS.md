Pricing Tiers Defaults (Taxilimo + NiceTaxiLimo)

Sources:
- Taxilimo: `taxilimo/prisma/seed.ts`
- NiceTaxiLimo: `nicetaxilimo/prisma/seed.ts`

Both projects currently use the SAME default tiers.

Mercedes E-Class (Berline Business)
- 0 - 4.99 km: 55 (sortOrder 1)
- 5 - 14.99 km: 70 (sortOrder 2)
- 15 - 24.99 km: 85 (sortOrder 3)
- 25 - 35.99 km: 105 (sortOrder 4)
- 36 - 44.99 km: 120 (sortOrder 5)
- 45 - 54.99 km: 155 (sortOrder 6)
- 55 - 64.99 km: 180 (sortOrder 7)
- 65 - 79.99 km: 210 (sortOrder 8)
Note: 80+ km uses `aboveMaxKmBasePrice = 240` + `aboveMaxKmPerKm = 2.00`

Mercedes V-Class (Van 7 places)
- 0 - 4.99 km: 75 (sortOrder 1)
- 5 - 14.99 km: 95 (sortOrder 2)
- 15 - 24.99 km: 110 (sortOrder 3)
- 25 - 35.99 km: 130 (sortOrder 4)
- 36 - 44.99 km: 150 (sortOrder 5)
- 45 - 54.99 km: 175 (sortOrder 6)
- 55 - 64.99 km: 200 (sortOrder 7)
- 65 - 79.99 km: 230 (sortOrder 8)
Note: 80+ km uses `aboveMaxKmBasePrice = 270` + `aboveMaxKmPerKm = 2.50`

