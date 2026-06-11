import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Clock3, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@njstore/ui';
import type { StoreLayoutOutletContext } from '../../components/layout/StoreLayout';
import { buildWhatsAppUrl, normalizeDialTarget, normalizeDisplayPhone, normalizeWhatsAppNumber, SUPPORT_WHATSAPP_MESSAGE } from '../../components/layout/storefrontConfig';
import { contactService } from '../../services/contactService';
import { buildMapSearchUrl, resolveFooterSettings } from '../../utils/footer';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10),
  website: z.string().max(0).optional()
});

const contactSubmissionCooldownMs = 30_000;

interface FloatingFieldProps {
  id: string;
  label: string;
  type?: 'email' | 'text';
  error?: string;
  registration: UseFormRegister<z.infer<typeof schema>>;
}

const FloatingField = ({ id, label, type = 'text', error, registration }: FloatingFieldProps): JSX.Element => {
  const registered = registration(id as 'name' | 'email');

  return (
    <label className="block" htmlFor={id}>
      <div className="group relative">
        <input
          id={id}
          type={type}
          placeholder=" "
          className={`peer h-14 w-full rounded-[20px] border bg-white/[0.04] px-4 pt-6 text-sm text-white outline-none transition-[border-color,box-shadow,background-color,color] duration-200 ${
            error
              ? 'border-rose-400/60 focus:border-rose-300 focus:ring-4 focus:ring-rose-400/10'
              : 'border-white/10 focus:border-gold/40 focus:ring-4 focus:ring-gold/10'
          }`}
          {...registered}
        />
        <span className="pointer-events-none absolute left-4 top-3 text-[11px] uppercase tracking-[0.22em] text-gold transition-[transform,top,color,font-size,letter-spacing] duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-gray-400 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-gold">
          {label}
        </span>
      </div>
      {error ? <span className="mt-2 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
};

interface FloatingTextareaProps {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegister<z.infer<typeof schema>>;
}

const FloatingTextarea = ({ id, label, error, registration }: FloatingTextareaProps): JSX.Element => {
  const registered = registration(id as 'message');

  return (
    <label className="block" htmlFor={id}>
      <div className="group relative">
        <textarea
          id={id}
          placeholder=" "
          className={`peer min-h-[180px] w-full rounded-[24px] border bg-white/[0.04] px-4 pt-7 text-sm text-white outline-none transition-[border-color,box-shadow,background-color,color] duration-200 ${
            error
              ? 'border-rose-400/60 focus:border-rose-300 focus:ring-4 focus:ring-rose-400/10'
              : 'border-white/10 focus:border-gold/40 focus:ring-4 focus:ring-gold/10'
          }`}
          {...registered}
        />
        <span className="pointer-events-none absolute left-4 top-3 text-[11px] uppercase tracking-[0.22em] text-gold transition-[top,color,font-size,letter-spacing] duration-200 peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-gray-400 peer-focus:top-3 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-gold">
          {label}
        </span>
      </div>
      {error ? <span className="mt-2 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
};

const contactInfoCards = (footer: ReturnType<typeof resolveFooterSettings>) => [
  {
    key: 'email',
    label: 'Email',
    value: footer.email,
    href: `mailto:${footer.email}`,
    icon: Mail
  },
  {
    key: 'phone',
    label: 'Phone',
    value: normalizeDisplayPhone(footer.phone),
    href: normalizeDialTarget(footer.phone),
    icon: Phone
  },
  {
    key: 'address',
    label: 'Address',
    value: footer.physicalAddress,
    href: buildMapSearchUrl(footer),
    icon: MapPin
  },
  {
    key: 'hours',
    label: 'Hours',
    value: footer.openingHours || 'Online support available anytime.',
    href: buildWhatsAppUrl(normalizeWhatsAppNumber(footer.whatsappNumber), SUPPORT_WHATSAPP_MESSAGE),
    icon: Clock3
  }
];

const supportTopics = [
  {
    title: 'Product guidance',
    description: 'Get help comparing models, specs, and compatibility before you decide.',
    icon: MessageCircle
  },
  {
    title: 'Quotation support',
    description: 'Confirm stock, pricing, and delivery expectations with the team.',
    icon: Mail
  },
  {
    title: 'After-sales help',
    description: 'Reach out for order clarifications, updates, or follow-up support.',
    icon: Phone
  }
];

export const Contact = (): JSX.Element => {
  const outletContext = useOutletContext<StoreLayoutOutletContext | undefined>();
  const footer = resolveFooterSettings(outletContext?.siteConfig);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const [submissionLockedUntil, setSubmissionLockedUntil] = useState<number | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const whatsappHref = buildWhatsAppUrl(normalizeWhatsAppNumber(footer.whatsappNumber), SUPPORT_WHATSAPP_MESSAGE);
  const isSubmissionCoolingDown = submissionLockedUntil !== null && Date.now() < submissionLockedUntil;

  useEffect(() => {
    if (!submissionLockedUntil) {
      return undefined;
    }

    const delay = Math.max(submissionLockedUntil - Date.now(), 0);
    const timeoutId = window.setTimeout(() => {
      setSubmissionLockedUntil(null);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [submissionLockedUntil]);

  return (
    <div className="page-shell page-nav-gap pb-0">
      <section className="static-page-hero relative overflow-visible px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.32em] text-gold">Contact</p>
            <h1 className="mt-3 font-display text-[2.6rem] leading-[0.98] text-white sm:text-[3.3rem]">Let&apos;s start the conversation.</h1>
            <p className="mt-4 max-w-2xl text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">
              Reach the {footer.companyName} team for product guidance, quotation support, delivery clarifications, or after-sales help. The details below stay synced with the storefront footer automatically.
            </p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {supportTopics.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-sm font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-gray-300">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Send a message</p>
                  <h2 className="mt-2 font-display text-[1.8rem] text-white">We usually reply fast.</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.22em] text-gray-400">
                  Secure contact form
                </div>
              </div>

              <AnimatePresence>
                {lastSubmittedAt ? (
                  <motion.div
                    key={lastSubmittedAt}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-5 flex items-center gap-3 rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                    <span>Your message is on its way. We&apos;ll follow up as soon as we can.</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <form
                className="mt-6 grid gap-4"
                onSubmit={form.handleSubmit(async (values) => {
                  if (submissionLockedUntil && Date.now() < submissionLockedUntil) {
                    toast.error('Please wait a moment before sending another message.');
                    return;
                  }

                  try {
                    const { website, ...payload } = values;
                    await contactService.send(website ? values : payload);
                    setLastSubmittedAt(Date.now());
                    setSubmissionLockedUntil(Date.now() + contactSubmissionCooldownMs);
                    toast.success('Message sent successfully');
                    form.reset();
                  } catch (error) {
                    toast.error(getApiErrorMessage(error, 'Unable to send your message right now.'));
                  }
                })}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FloatingField id="name" label="Name" registration={form.register} error={form.formState.errors.name?.message} />
                  <FloatingField id="email" label="Email" type="email" registration={form.register} error={form.formState.errors.email?.message} />
                </div>
                <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" {...form.register('website')} />
                <FloatingTextarea id="message" label="Message" registration={form.register} error={form.formState.errors.message?.message} />
                <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-dark-light/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">Tell us what you&apos;re shopping for, what model you need, or any delivery details we should know.</p>
                  <Button type="submit" size="lg" disabled={isSubmissionCoolingDown} isLoading={form.formState.isSubmitting} loadingLabel="Sending">
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {isSubmissionCoolingDown ? 'Message Sent' : 'Send Message'}
                  </Button>
                </div>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="space-y-6"
            >
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Visit or call</p>
                    <h2 className="mt-2 font-display text-[1.8rem] text-white">Store information</h2>
                  </div>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors duration-200 hover:border-gold/40 hover:bg-gold/15"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp
                  </a>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {contactInfoCards(footer).map((item) => {
                    const Icon = item.icon;

                    return (
                      <a
                        key={item.key}
                        href={item.href}
                        target={item.key === 'hours' || item.key === 'address' ? '_blank' : undefined}
                        rel={item.key === 'hours' || item.key === 'address' ? 'noopener noreferrer' : undefined}
                        className="group rounded-[20px] border border-white/10 bg-dark-light/80 p-4 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/10"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Open</span>
                        </span>
                        <span className="mt-4 block">
                          <span className="block text-[11px] uppercase tracking-[0.24em] text-gray-500">{item.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-gray-200 sm:text-sm sm:leading-6">{item.value}</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Map preview</p>
                    <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">{footer.physicalAddress}</p>
                  </div>
                  <a
                    href={buildMapSearchUrl(footer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    Open Map
                  </a>
                </div>
                <iframe
                  title={`${footer.companyName} location`}
                  className="h-[340px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={footer.mapEmbedUrl}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};
