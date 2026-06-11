import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Input, Textarea } from '@njstore/ui';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { adminService } from '../../services/adminService';
import { AdminInlineNotice, AdminPageHeader, AdminStatGrid, AdminSurfacePanel } from '../../components/ui/AdminSurface';
import { getApiErrorMessage } from '../../utils/apiError';

const broadcastSchema = z
  .object({
    audience: z.enum(['customers', 'unverifiedCustomers', 'newsletter', 'all']),
    subject: z.string().trim().min(3, 'Enter a subject').max(140),
    previewText: z.string().trim().max(180).optional(),
    headline: z.string().trim().min(3, 'Enter a headline').max(140),
    body: z.string().trim().min(12, 'Add the message body').max(4000),
    ctaLabel: z.string().trim().max(80).optional(),
    ctaUrl: z.string().trim().max(500).optional()
  })
  .superRefine((value, ctx) => {
    const hasCtaLabel = Boolean(value.ctaLabel?.trim());
    const hasCtaUrl = Boolean(value.ctaUrl?.trim());

    if (hasCtaLabel !== hasCtaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide both CTA label and CTA URL, or leave both empty.',
        path: hasCtaLabel ? ['ctaUrl'] : ['ctaLabel']
      });
    }

    if (hasCtaUrl && !/^\/|^https?:\/\//i.test(value.ctaUrl ?? '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CTA URL must start with "/" or "http(s)://".',
        path: ['ctaUrl']
      });
    }
  });

type CampaignAudience = z.infer<typeof broadcastSchema>['audience'];

const audienceOptions: Array<{
  value: CampaignAudience;
  label: string;
  description: string;
}> = [
  {
    value: 'all',
    label: 'All Reachable',
    description: 'Deduplicated send to verified customers plus confirmed newsletter subscribers.'
  },
  {
    value: 'customers',
    label: 'Customers',
    description: 'Only active customer accounts with verified email addresses.'
  },
  {
    value: 'unverifiedCustomers',
    label: 'Unverified Customers',
    description: 'Active customer accounts whose email addresses are not yet verified.'
  },
  {
    value: 'newsletter',
    label: 'Newsletter',
    description: 'Everyone currently subscribed through the storefront newsletter.'
  }
];

const getAudienceReach = (
  audience: CampaignAudience,
  summary: { customers: number; unverifiedCustomers: number; newsletterSubscribers: number; totalUniqueRecipients: number } | undefined
): number => {
  if (!summary) {
    return 0;
  }

  if (audience === 'customers') {
    return summary.customers;
  }

  if (audience === 'unverifiedCustomers') {
    return summary.unverifiedCustomers;
  }

  if (audience === 'newsletter') {
    return summary.newsletterSubscribers;
  }

  return summary.totalUniqueRecipients;
};

export const Broadcasts = (): JSX.Element => {
  const { hasPermissions } = useAdminPermissions();
  const canWriteBroadcasts = hasPermissions('setting:write');
  const audienceQuery = useQuery({
    queryKey: ['admin', 'broadcast-audience'],
    queryFn: () => adminService.broadcastAudience()
  });
  const audienceSummary = audienceQuery.data?.data;
  const form = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      audience: 'all',
      subject: '',
      previewText: '',
      headline: '',
      body: '',
      ctaLabel: '',
      ctaUrl: ''
    }
  });

  const selectedAudience = form.watch('audience');
  const selectedReach = getAudienceReach(selectedAudience, audienceSummary);
  const subject = form.watch('subject')?.trim();
  const previewText = form.watch('previewText')?.trim();
  const headline = form.watch('headline')?.trim();
  const body = form.watch('body')?.trim();
  const ctaLabel = form.watch('ctaLabel')?.trim();
  const selectedAudienceLabel = audienceOptions.find((option) => option.value === selectedAudience)?.label ?? 'Audience';
  const bodyParagraphs = body
    ? body.split(/\n\s*\n/).filter(Boolean)
    : ['Your broadcast message will preview here. Add paragraphs, offer details, and a clear next step.'];

  return (
    <div className="space-y-3 pb-2">
      <AdminPageHeader
        eyebrow="Administration"
        title="Broadcasts"
        description="Send promotional emails and launch announcements to verified customers, confirmed newsletter subscribers, or both from one admin workspace."
        action={
          !canWriteBroadcasts ? (
            <Badge variant="default" className="bg-white/[0.06] text-gray-300">
              Read Only
            </Badge>
          ) : undefined
        }
        meta={[
          {
            label: 'Reachable now',
            value: (audienceSummary?.totalUniqueRecipients ?? 0).toLocaleString(),
            support: 'Unique email addresses currently available across verified customers, unverified customers, and confirmed subscribers.',
            tone: 'gold'
          },
          {
            label: 'Selected audience',
            value: selectedReach.toLocaleString(),
            support: `${selectedAudienceLabel} will receive the next send.`,
            tone: 'blue'
          }
        ]}
      />
      <AdminStatGrid
        items={[
          {
            label: 'Verified customers',
            value: (audienceSummary?.customers ?? 0).toLocaleString(),
            support: 'Active customer accounts with verified email addresses.',
            tone: 'emerald'
          },
          {
            label: 'Unverified customers',
            value: (audienceSummary?.unverifiedCustomers ?? 0).toLocaleString(),
            support: 'Active customer accounts that have not completed email verification yet.',
            tone: 'rose'
          },
          {
            label: 'Newsletter subscribers',
            value: (audienceSummary?.newsletterSubscribers ?? 0).toLocaleString(),
            support: 'Current newsletter subscribers ready for campaigns.',
            tone: 'gold'
          },
          {
            label: 'Unique recipients',
            value: (audienceSummary?.totalUniqueRecipients ?? 0).toLocaleString(),
            support: 'Duplicate emails across audiences are only sent once.',
            tone: 'blue'
          },
          {
            label: 'Current send',
            value: selectedReach.toLocaleString(),
            support: 'Estimated delivery count for the audience selected below.',
            tone: 'slate'
          }
        ]}
      />
      <AdminInlineNotice>
        Broadcast emails use the store email sender and respect the current newsletter list. Verified and unverified customer audiences are available separately, and All Reachable deduplicates across both customer segments plus confirmed newsletter subscribers.
      </AdminInlineNotice>
      <AdminSurfacePanel>
        <form
          className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(28rem,1.08fr)]"
          onSubmit={form.handleSubmit(async (values) => {
            if (!canWriteBroadcasts) {
              return;
            }

            try {
              const result = await adminService.sendBroadcast({
                audience: values.audience,
                subject: values.subject.trim(),
                previewText: values.previewText?.trim() || undefined,
                headline: values.headline.trim(),
                body: values.body.trim(),
                ctaLabel: values.ctaLabel?.trim() || undefined,
                ctaUrl: values.ctaUrl?.trim() || undefined
              });
              toast.success(
                `Broadcast sent to ${result.data.sent} recipients${result.data.failed > 0 ? ` (${result.data.failed} failed)` : ''}.`
              );
              form.reset({
                audience: values.audience,
                subject: '',
                previewText: '',
                headline: '',
                body: '',
                ctaLabel: '',
                ctaUrl: ''
              });
              await audienceQuery.refetch();
            } catch (error) {
              toast.error(getApiErrorMessage(error, 'Unable to send this broadcast right now.'));
            }
          })}
        >
          <fieldset
            disabled={!canWriteBroadcasts}
            className="space-y-5 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,26,46,0.96),rgba(10,18,34,0.96))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.22)] sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Campaign builder</p>
                <h2 className="mt-2 font-display text-[1.45rem] leading-tight text-white">Campaign Email</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Choose who should receive this campaign, then write the subject and message.</p>
              </div>
              <div className="rounded-2xl border border-gold/20 bg-gold/[0.08] px-3.5 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Selected reach</p>
                <p className="mt-1 font-display text-xl leading-none text-white">{selectedReach.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-200">Audience</p>
                  <p className="mt-1 text-xs text-gray-500">Pick one recipient group for this send.</p>
                </div>
                <Badge variant="default" className="bg-white/[0.06] text-gray-300">
                  {selectedAudienceLabel}
                </Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {audienceOptions.map((option) => {
                  const isActive = selectedAudience === option.value;
                  const reach = getAudienceReach(option.value, audienceSummary);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => form.setValue('audience', option.value, { shouldDirty: true, shouldValidate: true })}
                      className={`group min-h-[148px] rounded-[22px] border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,background-color,transform,box-shadow] duration-200 ${
                        isActive
                          ? 'border-gold/35 bg-[linear-gradient(145deg,rgba(212,175,55,0.16),rgba(17,29,51,0.86))] text-white shadow-[0_16px_28px_rgba(212,175,55,0.08)]'
                          : 'border-white/10 bg-[#101b30]/72 text-gray-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#14233f]/85'
                      }`}
                    >
                      <div className="flex min-h-full flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-[10px] uppercase tracking-[0.22em] ${isActive ? 'text-gold' : 'text-gray-500 group-hover:text-gray-400'}`}>
                            {option.label}
                          </p>
                          <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${isActive ? 'bg-gold shadow-[0_0_16px_rgba(212,175,55,0.55)]' : 'bg-white/15'}`} />
                        </div>
                        <p className="mt-3 flex-1 text-sm leading-6">{option.description}</p>
                        <p className="mt-4 font-display text-[1.55rem] leading-none text-white">{reach.toLocaleString()}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2">
              <Input
                label="Subject Line"
                placeholder="April launch week starts now"
                {...form.register('subject')}
                error={form.formState.errors.subject?.message}
              />
              <Input
                label="Preview Text"
                placeholder="Fresh price drops are now live."
                {...form.register('previewText')}
                error={form.formState.errors.previewText?.message}
              />
            </div>

            <Input
              label="Headline"
              placeholder="Fresh arrivals are ready to ship"
              {...form.register('headline')}
              error={form.formState.errors.headline?.message}
            />

            <Textarea
              label="Message"
              className="min-h-[220px]"
              placeholder={'See the latest launch-ready products.\n\nGet your quote before the wider release.'}
              {...form.register('body')}
              error={form.formState.errors.body?.message}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="CTA Label" placeholder="Browse Launch Picks" {...form.register('ctaLabel')} error={form.formState.errors.ctaLabel?.message} />
              <Input label="CTA URL" placeholder="/shop?featured=true" {...form.register('ctaUrl')} error={form.formState.errors.ctaUrl?.message} />
            </div>

            {canWriteBroadcasts ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <p className="text-sm text-gray-400">Estimated send: {selectedReach.toLocaleString()} recipients.</p>
                <Button type="submit" isLoading={form.formState.isSubmitting}>
                  Send Broadcast
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-400">This account can review audience counts but cannot send broadcasts.</p>
            )}
          </fieldset>

          <div className="space-y-5 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,25,44,0.94),rgba(10,17,31,0.96))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.2)] sm:p-5 xl:sticky xl:top-4 xl:self-start">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-gold">Live preview</p>
                <h2 className="mt-2 font-display text-[1.45rem] leading-tight text-white">Email Layout</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Check the subject, preview text, message rhythm, and CTA before sending.</p>
              </div>
              <Badge variant="default" className="bg-blue-400/10 text-blue-200">
                {selectedReach.toLocaleString()} recipients
              </Badge>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-gold/15 bg-[#07101f] shadow-[0_22px_44px_rgba(0,0,0,0.28)]">
              <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-white">{subject || 'April launch week starts now'}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-gray-400">
                    Preview
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-500">{previewText || 'Short preview text appears here before the message opens.'}</p>
              </div>
              <div className="bg-[linear-gradient(180deg,rgba(12,27,51,0.98),rgba(7,16,31,0.98))] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-gold">{selectedAudienceLabel}</p>
                  <p className="text-xs text-gray-500">{selectedReach.toLocaleString()} estimated</p>
                </div>
                <h3 className="mt-5 max-w-3xl font-display text-[1.9rem] leading-tight text-white sm:text-[2.2rem]">
                  {headline || 'Your campaign headline will appear here.'}
                </h3>
                <div className="mt-5 space-y-4 text-[0.95rem] leading-7 text-gray-300">
                  {bodyParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {ctaLabel ? (
                  <div className="mt-6">
                    <span className="inline-flex rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-dark shadow-[0_12px_24px_rgba(212,175,55,0.18)]">
                      {ctaLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <AdminInlineNotice>
              Relative CTA links like `/shop?featured=true` are converted into full store URLs automatically when the email is sent.
            </AdminInlineNotice>
          </div>
        </form>
      </AdminSurfacePanel>
    </div>
  );
};
