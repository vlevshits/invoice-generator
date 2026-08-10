const units = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
]

const tens = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
]

function convertChunk(num: number): string {
  let str = ''
  if (num >= 100) {
    str += units[Math.floor(num / 100)] + ' hundred '
    num %= 100
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)]
    if (num % 10 > 0) {
      str += '-' + units[num % 10]
    }
  } else if (num > 0) {
    str += units[num]
  }
  return str.trim()
}

export function numberToWords(amount: number, currency: string = 'GEL'): string {
  if (amount === 0) return `Zero ${currency}`

  const intPart = Math.floor(Math.abs(amount))
  const centsPart = Math.round((Math.abs(amount) - intPart) * 100)

  let words = ''

  if (intPart === 0) {
    words = 'zero'
  } else {
    const millions = Math.floor(intPart / 1_000_000)
    const thousands = Math.floor((intPart % 1_000_000) / 1000)
    const remainder = intPart % 1000

    if (millions > 0) {
      words += convertChunk(millions) + ' million '
    }
    if (thousands > 0) {
      words += convertChunk(thousands) + ' thousand '
    }
    if (remainder > 0) {
      words += convertChunk(remainder)
    }
  }

  words = words.trim()
  // Capitalize first letter of words
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1)
  }

  if (centsPart > 0) {
    words += ` and ${centsPart}/100`
  }

  return `${words} ${currency.toUpperCase()}`
}
