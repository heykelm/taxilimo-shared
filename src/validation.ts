/**
 * Validation utilities for email and phone numbers
 */

/**
 * Strict email validation
 * Validates format according to RFC 5322 (simplified)
 */
export function isValidEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmed = email.trim().toLowerCase()

  // Basic length check
  if (trimmed.length < 5 || trimmed.length > 254) {
    return { valid: false, error: 'Email must be between 5 and 254 characters' }
  }

  // Strict email regex (RFC 5322 compliant)
  // Format: local-part@domain
  // local-part: letters, numbers, dots, hyphens, underscores, plus signs
  // domain: letters, numbers, dots, hyphens
  const emailRegex =
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Check for consecutive dots
  if (trimmed.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' }
  }

  // Check that local part and domain exist
  const parts = trimmed.split('@')
  if (parts.length !== 2) {
    return { valid: false, error: 'Email must contain exactly one @ symbol' }
  }

  const [localPart, domain] = parts

  // Local part validation
  if (localPart.length === 0 || localPart.length > 64) {
    return { valid: false, error: 'Email local part must be between 1 and 64 characters' }
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, error: 'Email local part cannot start or end with a dot' }
  }

  // Domain validation
  if (domain.length === 0 || domain.length > 253) {
    return { valid: false, error: 'Email domain must be between 1 and 253 characters' }
  }

  // Domain must have at least one dot
  if (!domain.includes('.')) {
    return { valid: false, error: 'Email domain must contain a top-level domain' }
  }

  // Domain cannot start or end with dot or hyphen
  if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
    return { valid: false, error: 'Invalid email domain format' }
  }

  // Top-level domain must be at least 2 characters
  const tld = domain.split('.').pop()
  if (!tld || tld.length < 2) {
    return { valid: false, error: 'Email must have a valid top-level domain (at least 2 characters)' }
  }

  // Check for common disposable email domains
  const disposableDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'getnada.com',
  ]
  if (disposableDomains.some((domainName) => trimmed.includes(`@${domainName}`))) {
    return { valid: false, error: 'Disposable email addresses are not allowed' }
  }

  return { valid: true }
}

/**
 * Strict phone number validation
 * Supports international format with country code
 */
export function isValidPhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' }
  }

  const trimmed = phone.trim()

  // Remove all non-digit characters for validation
  const digitsOnly = trimmed.replace(/\D/g, '')

  // Check minimum and maximum length
  if (digitsOnly.length < 7) {
    return { valid: false, error: 'Phone number must contain at least 7 digits' }
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number cannot exceed 15 digits' }
  }

  // Check for all same digits (suspicious pattern)
  if (/^(\d)\1{6,}$/.test(digitsOnly)) {
    return { valid: false, error: 'Invalid phone number format' }
  }

  // Check for all zeros
  if (/^0+$/.test(digitsOnly)) {
    return { valid: false, error: 'Invalid phone number' }
  }

  // Validate format: must contain only digits, spaces, dashes, parentheses, plus sign
  // Plus sign must be at the beginning if present
  const phoneFormatRegex = /^\+?[\d\s\-()]+$/
  if (!phoneFormatRegex.test(trimmed)) {
    return { valid: false, error: 'Phone number contains invalid characters' }
  }

  // If starts with +, must have country code (at least 1 digit after +)
  if (trimmed.startsWith('+')) {
    const afterPlus = trimmed.substring(1).replace(/\D/g, '')
    if (afterPlus.length < 7) {
      return { valid: false, error: 'International phone number must include country code and be at least 7 digits' }
    }
  }

  // Check for valid country code patterns (common ones)
  // This is a simplified check - in production, consider using libphonenumber-js
  if (trimmed.startsWith('+')) {
    const commonCountryCodes = [
      '1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45',
      '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62',
      '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98',
      '212', '213', '216', '218', '220', '221', '222', '223', '224', '225', '226', '227', '228',
      '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241',
      '242', '243', '244', '245', '246', '248', '249', '250', '251', '252', '253', '254', '255',
      '256', '257', '258', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269',
      '290', '291', '297', '298', '299', '350', '351', '352', '353', '354', '355', '356', '357',
      '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '380', '381',
      '382', '383', '385', '386', '387', '389', '420', '421', '423', '500', '501', '502', '503',
      '504', '505', '506', '507', '508', '509', '590', '591', '592', '593', '594', '595', '596',
      '597', '598', '599', '670', '672', '673', '674', '675', '676', '677', '678', '679', '680',
      '681', '682', '683', '684', '685', '686', '687', '688', '689', '690', '691', '692', '850',
      '852', '853', '855', '856', '880', '886', '960', '961', '962', '963', '964', '965', '966',
      '967', '968', '970', '971', '972', '973', '974', '975', '976', '977', '992', '993', '994',
      '995', '996', '998',
    ]

    const hasValidCountryCode = commonCountryCodes.some((code) => digitsOnly.startsWith(code))
    if (!hasValidCountryCode && digitsOnly.length < 10) {
      // If no recognized country code and less than 10 digits, might be invalid
      // But we'll be lenient here - just warn if it's clearly wrong
    }
  }

  // French phone number specific validation (if starts with 0 or +33)
  if (trimmed.startsWith('0') || trimmed.startsWith('+33') || trimmed.startsWith('0033')) {
    const frenchDigits = trimmed.replace(/\D/g, '')
    // Remove country code if present
    const localNumber = frenchDigits.startsWith('33') ? frenchDigits.substring(2) : frenchDigits
    // French numbers: 10 digits, starting with 0, or 9 digits without 0
    if (localNumber.length === 10 && localNumber.startsWith('0')) {
      // Valid French format: 0X XX XX XX XX
      return { valid: true }
    } else if (localNumber.length === 9) {
      // Valid French format without leading 0
      return { valid: true }
    }
  }

  return { valid: true }
}

/**
 * Real-time validation for email (for use in input onChange)
 */
export function validateEmailOnChange(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: true } // Don't show error while typing
  }

  return isValidEmail(email)
}

/**
 * Real-time validation for phone (for use in input onChange)
 */
export function validatePhoneOnChange(phone: string): { valid: boolean; error?: string } {
  if (!phone) {
    return { valid: true } // Don't show error while typing
  }

  return isValidPhone(phone)
}
