import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CurrencyRateDto } from '@njstore/types';
import { siteConfigService } from '../services/siteConfigService';
import { defaultCurrency, normalizeSupportedCurrencies } from '../utils/currency';
import { readStorageItem, writeStorageItem } from '../utils/browserStorage';

interface CurrencyContextValue {
  activeCurrency: CurrencyRateDto;
  supportedCurrencies: CurrencyRateDto[];
  setCurrency: (code: string) => void;
}

const defaultContextValue: CurrencyContextValue = {
  activeCurrency: defaultCurrency,
  supportedCurrencies: [defaultCurrency],
  setCurrency: () => undefined
};

const CurrencyContext = createContext<CurrencyContextValue>(defaultContextValue);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const { data: config } = useQuery({
    queryKey: ['site-config'],
    queryFn: () => siteConfigService.get(),
    staleTime: 60 * 60_000
  });
  const [activeCurrencyCode, setActiveCurrencyCode] = useState<string>(() => readStorageItem('nj_active_currency') ?? defaultCurrency.code);

  const supportedCurrencies = normalizeSupportedCurrencies(config?.supportedCurrencies);
  const activeCurrency =
    supportedCurrencies.find((currency) => currency.code === activeCurrencyCode)
    ?? supportedCurrencies.find((currency) => currency.isDefault)
    ?? defaultCurrency;

  useEffect(() => {
    if (supportedCurrencies.some((currency) => currency.code === activeCurrencyCode)) {
      return;
    }

    const nextCurrencyCode = supportedCurrencies.find((currency) => currency.isDefault)?.code ?? defaultCurrency.code;
    setActiveCurrencyCode(nextCurrencyCode);
    writeStorageItem('nj_active_currency', nextCurrencyCode);
  }, [activeCurrencyCode, supportedCurrencies]);

  const setCurrency = useCallback((code: string) => {
    setActiveCurrencyCode(code);
    writeStorageItem('nj_active_currency', code);
  }, []);

  const value = useMemo(
    () => ({
      activeCurrency,
      supportedCurrencies,
      setCurrency
    }),
    [activeCurrency, setCurrency, supportedCurrencies]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextValue => useContext(CurrencyContext);
