export type BookingFinancialInput = {
  estimatedPrice: number | null | undefined
  finalPrice?: number | null | undefined
  promoCode?: string | null | undefined
  discountAmount?: number | null | undefined
  discountPercent?: number | null | undefined
  depositAmount?: number | null | undefined
  depositPercent?: number | null | undefined
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function computeBookingFinancials(input: BookingFinancialInput) {
  const subtotal = input.estimatedPrice ?? 0
  const discount = input.discountAmount ?? 0
  const computedTotal = roundMoney(Math.max(0, subtotal - discount))

  // If a finalPrice is present, prefer it only if it's a finite number.
  // If a discount exists, ignore finalPrice if it disagrees with computedTotal (prevents regressions).
  const total = (() => {
    if (typeof input.finalPrice !== 'number' || !Number.isFinite(input.finalPrice)) return computedTotal
    const fp = roundMoney(Math.max(0, input.finalPrice))
    if (discount > 0 && Math.abs(fp - computedTotal) > 0.01) return computedTotal
    return fp
  })()

  const depositPaid =
    typeof input.depositAmount === 'number' && Number.isFinite(input.depositAmount)
      ? roundMoney(Math.max(0, input.depositAmount))
      : 0

  // If depositPercent isn't explicitly provided, infer it from depositPaid/total.
  // This keeps display consistent without requiring a DB schema change.
  const depositPercent = (() => {
    if (typeof input.depositPercent === 'number' && Number.isFinite(input.depositPercent)) return input.depositPercent
    if (depositPaid > 0 && total > 0) return Math.round((depositPaid / total) * 100)
    return 0
  })()

  const remainingToPay = roundMoney(Math.max(0, total - depositPaid))

  return {
    subtotal,
    discount,
    total,
    depositPercent,
    depositPaid,
    remainingToPay,
  }
}

export function computeDepositAmount(totalAfterDiscount: number, depositPercent: number = 20) {
  const base = Number.isFinite(totalAfterDiscount) ? totalAfterDiscount : 0
  const pct = Number.isFinite(depositPercent) ? depositPercent : 20
  return roundMoney(Math.max(0, base) * (pct / 100))
}

/**
 * Deposit policy:
 * - < 6h: 100%
 * - < 24h: 65%
 * - otherwise: 0%
 */
export function getRequiredDepositPercent(
  pickupDate: string | Date,
  pickupTime: string,
  confirmationDate?: Date
): number {
  try {
    const confirmDate = confirmationDate || new Date()

    let pickupDateObj: Date
    if (pickupDate instanceof Date) {
      pickupDateObj = pickupDate
    } else {
      const datePart = pickupDate.split('T')[0]
      const [year, month, day] = datePart.split('-').map(Number)
      const [hh, mm] = pickupTime.split(':').map((v) => parseInt(v, 10))
      pickupDateObj = new Date(year, month - 1, day, hh || 0, mm || 0, 0, 0)
    }

    const diffMs = pickupDateObj.getTime() - confirmDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours > 0 && diffHours <= 6) return 100
    if (diffHours > 0 && diffHours <= 24) return 65
    return 0
  } catch {
    return 0
  }
}
