const units = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
]

const tens = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
]

function convertChunk(num: number): string {
  if (isNaN(num) || num <= 0) return ''
  let str = ''
  if (num >= 100) {
    const hundredIdx = Math.floor(num / 100)
    if (units[hundredIdx]) {
      str += units[hundredIdx] + ' hundred '
    }
    num %= 100
  }
  if (num >= 20) {
    const tenIdx = Math.floor(num / 10)
    if (tens[tenIdx]) {
      str += tens[tenIdx]
    }
    if (num % 10 > 0 && units[num % 10]) {
      str += '-' + units[num % 10]
    }
  } else if (num > 0 && units[num]) {
    str += units[num]
  }
  return str.trim()
}

export function numberToWords(amount: number, currency: string = 'GEL'): string {
  if (isNaN(amount) || !isFinite(amount) || amount === 0) {
    return `Zero ${currency.toUpperCase()}`
  }

  const absAmount = Math.abs(amount)
  const intPart = Math.floor(absAmount)
  const centsPart = Math.round((absAmount - intPart) * 100)

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
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1)
  }

  if (centsPart > 0) {
    words += ` and ${centsPart}/100`
  }

  return `${words} ${currency.toUpperCase()}`
}
