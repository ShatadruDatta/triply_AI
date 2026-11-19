// Best-effort default currency from the device region. The server accepts any ISO 4217 code.
const BY_REGION: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', IN: 'INR', JP: 'JPY', AU: 'AUD', NZ: 'NZD', CN: 'CNY',
  KR: 'KRW', SG: 'SGD', HK: 'HKD', TH: 'THB', ID: 'IDR', MY: 'MYR', AE: 'AED', CH: 'CHF',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', BR: 'BRL', MX: 'MXN', ZA: 'ZAR', TR: 'TRY',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
  AT: 'EUR', FI: 'EUR', GR: 'EUR',
};

export function deviceCurrency() {
  try {
    const region = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale).region;
    return (region && BY_REGION[region]) || 'USD';
  } catch {
    return 'USD';
  }
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}
