import { useMemo } from 'react';
import type { CurrencyRateDto } from '@njstore/types';
import { useCurrency } from '../context/CurrencyContext';
import { convertCurrencyAmount, defaultCurrency, formatCurrencyAmount } from '../utils/currency';

interface CurrencyFormatterValue {
  activeCurrency: CurrencyRateDto;
  convertAmount: (amount: number) => number;
  formatCurrency: (amount: number) => string;
}

export const useCurrencyFormatter = (): CurrencyFormatterValue => {
  const { activeCurrency } = useCurrency();
  const resolvedCurrency = activeCurrency ?? defaultCurrency;

  return useMemo(
    () => ({
      activeCurrency: resolvedCurrency,
      convertAmount: (amount: number) => convertCurrencyAmount(amount, resolvedCurrency),
      formatCurrency: (amount: number) => formatCurrencyAmount(amount, resolvedCurrency)
    }),
    [resolvedCurrency]
  );
};
