import type { SiteConfigDto } from '@njstore/types';
import { Clock3, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveFooterSettings, buildMapSearchUrl } from '../../utils/footer';
import { buildWhatsAppUrl, normalizeDialTarget, normalizeDisplayPhone, normalizeWhatsAppNumber, SUPPORT_WHATSAPP_MESSAGE } from './storefrontConfig';

interface FooterProps {
  siteConfig?: Partial<Pick<SiteConfigDto, 'footer' | 'storeName' | 'supportPhoneNumber' | 'whatsappNumber' | 'socialLinks'>>;
}

const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href);

const socialGlyphs: Record<string, string> = {
  Facebook: 'f',
  Instagram: 'ig',
  TikTok: 'tt',
  YouTube: 'yt',
  X: 'x'
};

export const Footer = ({ siteConfig }: FooterProps): JSX.Element => {
  const footer = resolveFooterSettings(siteConfig);
  const supportPhone = normalizeDisplayPhone(footer.phone);
  const phoneHref = normalizeDialTarget(footer.phone);
  const whatsappHref = buildWhatsAppUrl(normalizeWhatsAppNumber(footer.whatsappNumber), SUPPORT_WHATSAPP_MESSAGE);
  const mapHref = buildMapSearchUrl(footer);
  const socialLinks = [
    { label: 'Facebook', href: footer.socialLinks.facebook },
    { label: 'Instagram', href: footer.socialLinks.instagram },
    { label: 'TikTok', href: footer.socialLinks.tiktok },
    { label: 'YouTube', href: footer.socialLinks.youtube },
    { label: 'X', href: footer.socialLinks.x }
  ].filter((item) => item.href);

  return (
    <footer className="theme-footer-surface mt-4 border-t border-white/10 lg:mt-6">
      <div className="pt-8 sm:pt-10">
        <div className="theme-footer-card overflow-hidden rounded-b-none rounded-t-[20px] border-x-0 border-b-0 border-t border-white/10 px-3 py-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)] sm:rounded-t-[22px] sm:px-5 sm:py-6 lg:px-8 lg:py-7 xl:px-10">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr_1fr_0.95fr]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{footer.sectionTitles.about}</p>
              <div className="mt-3 flex items-start gap-4 rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
                {footer.logo?.url ? (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/80 bg-white p-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.2)] ring-1 ring-gold/15">
                    <img
                      src={footer.logo.url}
                      alt={footer.logo.alt ?? footer.companyName}
                      className="max-h-full max-w-full object-contain drop-shadow-sm"
                      loading="lazy"
                      decoding="async"
                      width={80}
                      height={80}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 pt-1">
                  <h3 className="font-display text-[1.65rem] leading-tight tracking-[-0.03em] text-white">{footer.companyName}</h3>
                  <p className="mt-2 max-w-md text-[13px] leading-6 text-gray-300">{footer.description}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{footer.sectionTitles.quickLinks}</p>
              <div className="mt-3 flex flex-col gap-2.5 text-[13px] text-gray-300">
                {footer.quickLinks.map((link) =>
                  isExternalHref(link.href) ? (
                    <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noopener noreferrer" className="transition-colors duration-200 hover:text-white">
                      {link.label}
                    </a>
                  ) : (
                    <Link key={`${link.label}-${link.href}`} to={link.href} className="transition-colors duration-200 hover:text-white">
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{footer.sectionTitles.contact}</p>
              <div className="mt-3 space-y-2.5 text-[13px] text-gray-300">
                <a href={`mailto:${footer.email}`} className="flex items-start gap-3 transition-colors duration-200 hover:text-white">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                  <span>{footer.email}</span>
                </a>
                <a href={phoneHref} className="flex items-start gap-3 transition-colors duration-200 hover:text-white">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                  <span>{supportPhone}</span>
                </a>
                <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition-colors duration-200 hover:text-white">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                  <span>{footer.physicalAddress}</span>
                </a>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{footer.sectionTitles.social}</p>
              <p className="mt-3 text-[13px] leading-6 text-gray-300">Reach out directly, follow new arrivals, or use WhatsApp for quick quotation support.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
                  >
                    {socialGlyphs[item.label]}
                  </a>
                ))}
              </div>
              <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-start gap-2.5 text-[13px] text-gray-300">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-white">Opening hours</p>
                    <p className="mt-0.5 leading-5 text-gray-400">{footer.openingHours || 'Contact us anytime online.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 text-[13px] text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <p>{footer.copyrightText}</p>
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${footer.email}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-white transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06]">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email us
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[13px] text-gold transition-colors duration-200 hover:border-gold/40 hover:bg-gold/15"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
