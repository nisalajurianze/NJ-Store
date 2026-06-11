import { motion } from 'framer-motion';
import { Award, BadgeCheck, Banknote, Lightbulb, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { StoreLayoutOutletContext } from '../../components/layout/StoreLayout';
import { BankTransferDetailsPanel } from '../../components/payment/BankTransferDetailsPanel';
import { useInView } from '../../hooks/useInView';

const storyMilestones = [
  {
    year: '2018',
    title: 'Started with a specialist mindset',
    body: 'The store began around a simple promise: premium electronics deserve clearer guidance, better sourcing, and honest quotation support before checkout.'
  },
  {
    year: '2021',
    title: 'Built for trust-first buying',
    body: 'We doubled down on quotation-first ordering so customers could confirm stock, payment, and delivery details before any purchase moved into processing.'
  },
  {
    year: 'Today',
    title: 'Focused on modern retail service',
    body: 'The brand now blends curated technology, responsive communication, and a more polished online journey for households, teams, and growing businesses.'
  }
];

const values = [
  {
    title: 'Quality',
    description: 'Curated inventory, clearer specs, and presentation that respects premium products.',
    icon: Award
  },
  {
    title: 'Trust',
    description: 'Transparent quotations, straightforward fulfilment expectations, and responsive updates.',
    icon: BadgeCheck
  },
  {
    title: 'Innovation',
    description: 'Fresh storefront experiences, practical automation, and a smoother path from browse to order.',
    icon: Lightbulb
  },
  {
    title: 'Customer focus',
    description: 'Support that helps people choose confidently instead of forcing them through guesswork.',
    icon: Users
  }
];

const brandHighlights = [
  {
    title: 'Quotation-first support',
    description: 'Check stock, pricing, and delivery details before a purchase moves forward.',
    icon: BadgeCheck
  },
  {
    title: 'Curated premium range',
    description: 'A more focused catalog with clearer presentation for higher-value electronics.',
    icon: Sparkles
  },
  {
    title: 'Helpful human guidance',
    description: 'Get real help with comparisons, compatibility, and next-step decisions.',
    icon: Users
  }
];

const purchasePromises = [
  'Guidance that makes premium products easier to compare.',
  'Transparent quotation support before any order moves ahead.',
  'Clear communication from first enquiry through fulfilment.'
];

const stats = [
  { label: 'Customers', value: 12000, suffix: '+' },
  { label: 'Products', value: 2500, suffix: '+' },
  { label: 'Orders', value: 30000, suffix: '+' },
  { label: 'Years', value: 8, suffix: '+' }
];

const CountUpStat = ({ value, suffix, label }: { value: number; suffix: string; label: string }): JSX.Element => {
  const { ref, inView } = useInView({ threshold: 0.35 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) {
      return;
    }

    let frameId = 0;
    const durationMs = 900;
    const startTime = performance.now();

    const tick = (timestamp: number): void => {
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      setDisplayValue(Math.round(value * (1 - Math.pow(1 - progress, 3))));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [inView, value]);

  return (
    <div ref={ref as unknown as RefObject<HTMLDivElement>} className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.24em] text-gold">{label}</p>
      <p className="mt-3 font-display text-[2.3rem] leading-none text-white sm:text-[2.8rem]">
        {displayValue.toLocaleString()}
        {suffix}
      </p>
    </div>
  );
};

export const About = (): JSX.Element => {
  const outletContext = useOutletContext<StoreLayoutOutletContext | undefined>();
  const brandName = outletContext?.siteConfig?.footer?.companyName?.trim() || outletContext?.siteConfig?.storeName?.trim() || 'NJ Store';
  const bankTransferDetails = outletContext?.siteConfig?.bankTransferDetails;
  const heroDescription = useMemo(
    () =>
      `${brandName} brings together official stock, design-led presentation, and a quotation-first buying flow that makes premium electronics feel more considered from the first click.`,
    [brandName]
  );

  return (
    <div className="page-shell page-nav-gap space-y-6 pb-0">
      <section className="static-page-hero relative overflow-visible px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative max-w-4xl">
          <p className="text-xs uppercase tracking-[0.32em] text-gold">About</p>
          <h1 className="mt-4 font-display text-[2.8rem] leading-[0.96] text-white sm:text-[4rem] lg:text-[4.7rem]">
            Premium electronics, presented with more clarity and care.
          </h1>
          <p className="mt-5 max-w-3xl text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">{heroDescription}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-medium text-gold transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-gold/15"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Shop Now
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
            >
              Contact Us
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {brandHighlights.map((item) => {
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
        </motion.div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
          className="rounded-[34px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 backdrop-blur-xl"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Brand story</p>
          <h2 className="mt-3 font-display text-[2rem] leading-tight text-white">Built around considered buying, not rushed selling.</h2>
          <p className="mt-4 text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">
            {brandName} is designed for shoppers who want more confidence before committing, whether they&apos;re choosing a flagship phone, a work-ready laptop, or a business printer fleet.
          </p>
          <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
            {purchasePromises.map((item) => (
              <div key={item} className="theme-dark-surface flex items-start gap-3 rounded-[20px] border border-white/10 bg-[#0a1322]/70 px-4 py-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-gold">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-xs leading-5 text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="space-y-4">
          {storyMilestones.map((item, index) => (
            <motion.article
              key={item.year}
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-gold to-transparent" />
              <div className="grid gap-4 pl-4 sm:grid-cols-[88px_1fr] sm:items-start">
                <div>
                  <span className="inline-flex rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-gold">
                    {item.year}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-[1.45rem] text-white">{item.title}</h3>
                  <p className="mt-3 text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">{item.body}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
          className="rounded-[30px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs uppercase tracking-[0.28em] text-gold">Payments</p>
          <h2 className="mt-3 font-display text-[2rem] leading-tight text-white">Bank details for confirmed orders</h2>
          <p className="mt-4 text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">
            Bank transfer details are published here for easier checking. Please wait until your quotation is confirmed before sending payment, then upload the receipt from your order page.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <BankTransferDetailsPanel details={bankTransferDetails} className="h-full" />
        </motion.div>
      </section>

      <section>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45 }}>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Values</p>
          <h2 className="mt-3 font-display text-[2.15rem] text-white">What shapes the experience</h2>
        </motion.div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {values.map((value, index) => {
            const Icon = value.icon;

            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.42, delay: index * 0.06 }}
                className="group rounded-[30px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-gold/20 hover:bg-white/[0.065]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-gray-500">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-[1.35rem] text-white">{value.title}</h3>
                <p className="mt-3 text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">{value.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45 }}>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Momentum</p>
          <h2 className="mt-3 font-display text-[2.15rem] text-white">A retail story still gaining speed</h2>
        </motion.div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <CountUpStat key={stat.label} label={stat.label} value={stat.value} suffix={stat.suffix} />
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.45 }}
        className="theme-promo-surface overflow-hidden rounded-[36px] border border-white/10 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.22)] sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-gold">Next step</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-display text-[2.2rem] leading-tight text-white">Explore the catalog or talk to the team about what you need next.</h2>
            <p className="mt-3 text-xs leading-6 text-gray-300 sm:text-sm sm:leading-7">
              Whether you know the exact model or you&apos;re comparing options, {brandName} is built to make high-value decisions feel more informed and less stressful.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-medium text-gold transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-gold/15"
            >
              Shop Now
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition-[transform,border-color,background-color,color] duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
