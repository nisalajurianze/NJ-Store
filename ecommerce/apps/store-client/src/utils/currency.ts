import type { CurrencyRateDto } from '@njstore/types';

export const defaultCurrency: Required<CurrencyRateDto> = {
  code: 'LKR',
  symbol: 'LKR',
  rate: 1,
  isDefault: true
};

export const normalizeSupportedCurrencies = (
  currencies: CurrencyRateDto[] | undefined | null
): CurrencyRateDto[] => {
  const normalized = (currencies ?? [])
    .map((currency) => ({
      code: currency.code?.trim().toUpperCase() || '',
      symbol: currency.symbol?.trim() || '',
      rate: currency.code?.trim().toUpperCase() === 'LKR' ? 1 : Math.max(currency.rate ?? 1, 0.0001),
      isDefault: Boolean(currency.isDefault)
    }))
    .filter((currency) => currency.code && currency.symbol);

  const unique = normalized.filter((currency, index, entries) => entries.findIndex((entry) => entry.code === currency.code) === index);

  if (!unique.some((currency) => currency.code === 'LKR')) {
    unique.unshift({ ...defaultCurrency });
  }

  const defaultIndex = unique.findIndex((currency) => currency.isDefault);
  const resolvedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;

  return unique.map((currency, index) => ({
    ...currency,
    rate: currency.code === 'LKR' ? 1 : currency.rate,
    isDefault: index === resolvedDefaultIndex
  }));
};

export const convertCurrencyAmount = (amount: number, currency: CurrencyRateDto = defaultCurrency): number =>
  Math.max(amount, 0) * (currency.rate || 1);

export const formatCurrencyAmount = (amount: number, currency: CurrencyRateDto = defaultCurrency): string => {
  const convertedAmount = convertCurrencyAmount(amount, currency);
  const fractionDigits = currency.code === 'LKR' ? 0 : 2;

  try {
    return new Intl.NumberFormat(currency.code === 'LKR' ? 'en-LK' : undefined, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(convertedAmount);
  } catch {
    return `${currency.symbol} ${convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    })}`;
  }
};
