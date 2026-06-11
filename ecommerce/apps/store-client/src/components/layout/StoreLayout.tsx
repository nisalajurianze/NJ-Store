import type { SiteConfigDto } from '@njstore/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CompareBar } from './CompareBar';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { Navbar } from './Navbar';
import { RouteSeo } from '../seo/RouteSeo';
import { StoreErrorBoundary } from '../system/StoreErrorBoundary';
import { useSocket } from '../../hooks/useSocket';
import { homeService } from '../../services/homeService';
import { siteConfigService } from '../../services/siteConfigService';
import {
  buildWhatsAppUrl,
  DEFAULT_MAINTENANCE_MESSAGE,
  normalizeDialTarget,
  normalizeDisplayPhone,
  normalizeWhatsAppNumber,
  SUPPORT_WHATSAPP_MESSAGE
} from './storefrontConfig';

const FloatingContactRail = lazy(() => import('./FloatingContactRail').then((module) => ({ default: module.FloatingContactRail })));

export interface StoreLayoutOutletContext {
  siteConfig?: SiteConfigDto;
}

const MaintenanceView = ({
  siteConfig
}: {
  siteConfig: Pick<SiteConfigDto, 'storeName' | 'supportPhoneNumber' | 'whatsappNumber' | 'maintenanceMode'>;
}): JSX.Element => {
  const supportPhone = normalizeDisplayPhone(siteConfig.supportPhoneNumber);
  const phoneHref = normalizeDialTarget(siteConfig.supportPhoneNumber);
  const whatsappHref = buildWhatsAppUrl(normalizeWhatsAppNumber(siteConfig.whatsappNumber), SUPPORT_WHATSAPP_MESSAGE);
  const message = siteConfig.maintenanceMode?.message?.trim() || DEFAULT_MAINTENANCE_MESSAGE;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_20%),linear-gradient(180deg,#07111f_0%,#0b1526_100%)] text-white">
      <main className="page-shell flex min-h-screen items-center py-16">
        <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:p-8 lg:max-w-3xl">
          <div className="inline-flex rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-gold">
            503 Maintenance Mode
          </div>
          <h1 className="mt-5 font-display text-[2.4rem] leading-none tracking-[-0.04em] text-white sm:text-[3rem]">
            {siteConfig.storeName} is temporarily offline
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-300">{message}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={phoneHref}
              className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.1]"
            >
              Call support
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-medium text-gold transition-colors duration-200 hover:border-gold/40 hover:bg-gold/15"
            >
              Message on WhatsApp
            </a>
          </div>
          <p className="mt-6 text-sm text-gray-400">Support line: {supportPhone}</p>
        </div>
      </main>
    </div>
  );
};

export const StoreLayout = (): JSX.Element => {
  useSocket();
  const location = useLocation();
  const queryClient = useQueryClient();
  const siteConfigQuery = useQuery({
    queryKey: ['site-config'],
    queryFn: () => siteConfigService.get(),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const siteConfig = siteConfigQuery.data;
  const outletContext: StoreLayoutOutletContext = { siteConfig };

  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: ['home-feed', 'guest'],
      queryFn: () => homeService.feed(),
      staleTime: 5 * 60_000
    });
  }, [location.pathname, queryClient]);

  if (siteConfig?.maintenanceMode?.enabled) {
    return <MaintenanceView siteConfig={siteConfig} />;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip pb-[calc(3rem+env(safe-area-inset-bottom))] sm:pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <RouteSeo storeName={siteConfig?.storeName} />
      <StoreErrorBoundary level="widget" title="Navigation is temporarily unavailable.">
        <Navbar
          siteConfig={
            siteConfig
              ? {
                  storeName: siteConfig.storeName,
                  storeLogo: siteConfig.storeLogo,
                  storeLogoDark: siteConfig.storeLogoDark,
                  storeLogoLight: siteConfig.storeLogoLight
                }
              : undefined
          }
        />
      </StoreErrorBoundary>
      <main className="min-h-0 flex-1 overflow-x-clip">
        <Outlet context={outletContext} />
        <StoreErrorBoundary level="widget" title="Compare tray is unavailable right now.">
          <CompareBar />
        </StoreErrorBoundary>
      </main>
      <StoreErrorBoundary level="widget" title="Footer content is temporarily unavailable.">
        <Footer siteConfig={siteConfig} />
      </StoreErrorBoundary>
      <StoreErrorBoundary level="widget" title="Mobile navigation is temporarily unavailable.">
        <MobileTabBar />
      </StoreErrorBoundary>
      <StoreErrorBoundary level="widget" title="Contact actions are temporarily unavailable.">
        <Suspense fallback={null}>
          <FloatingContactRail
            siteConfig={
              siteConfig
                ? {
                    supportPhoneNumber: siteConfig.supportPhoneNumber,
                    whatsappNumber: siteConfig.whatsappNumber
                  }
                : undefined
            }
          />
        </Suspense>
      </StoreErrorBoundary>
    </div>
  );
};
