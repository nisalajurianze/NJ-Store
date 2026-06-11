import { Types } from 'mongoose';
import type {
  BroadcastAudience,
  BroadcastAudienceSummaryDto,
  BroadcastCampaignInputDto,
  BroadcastDispatchDto
} from '@njstore/types';
import { NewsletterSubscriber } from '../../models/NewsletterSubscriber.js';
import { User } from '../../models/User.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { emailService } from '../emailService.js';
import { dedupeEmails, normalizeEmailAddress } from './adminShared.js';

const EMAIL_BATCH_SIZE = 25;

const broadcastAudienceLabels: Record<BroadcastAudience, string> = {
  customers: 'Verified Customers',
  unverifiedCustomers: 'Unverified Customers',
  newsletter: 'Confirmed Newsletter Subscribers',
  all: 'All Reachable Contacts',
  specificUsers: 'Selected User Segment'
};

const resolveBroadcastCtaUrl = (value: string | undefined, baseUrl: string): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

const fetchCustomerBroadcastEmails = async (): Promise<string[]> => {
  const customers = await User.find({
    role: 'customer',
    isActive: true,
    isEmailVerified: true
  })
    .select('email')
    .lean();

  return dedupeEmails(customers.map((customer) => customer.email));
};

const fetchUnverifiedCustomerBroadcastEmails = async (): Promise<string[]> => {
  const customers = await User.find({
    role: 'customer',
    isActive: true,
    isEmailVerified: false
  })
    .select('email')
    .lean();

  return dedupeEmails(customers.map((customer) => customer.email));
};

const fetchNewsletterBroadcastEmails = async (): Promise<string[]> => {
  const subscribers = await NewsletterSubscriber.find({ isConfirmed: true }).select('email').lean();
  return dedupeEmails(subscribers.map((subscriber) => subscriber.email));
};

const fetchSpecificUserBroadcastEmails = async (recipientUserIds: readonly string[] = []): Promise<string[]> => {
  const validUserIds = [...new Set(recipientUserIds.filter((userId) => Types.ObjectId.isValid(userId)))];
  if (validUserIds.length === 0) {
    return [];
  }

  const recipients = await User.find({
    _id: { $in: validUserIds.map((userId) => new Types.ObjectId(userId)) },
    isActive: true
  })
    .select('email')
    .lean();

  return dedupeEmails(recipients.map((recipient) => recipient.email));
};

const getBroadcastRecipientEmails = async (
  audience: BroadcastAudience,
  recipientUserIds: readonly string[] = []
): Promise<string[]> => {
  if (audience === 'specificUsers') {
    return fetchSpecificUserBroadcastEmails(recipientUserIds);
  }

  if (audience === 'customers') {
    return fetchCustomerBroadcastEmails();
  }

  if (audience === 'unverifiedCustomers') {
    return fetchUnverifiedCustomerBroadcastEmails();
  }

  if (audience === 'newsletter') {
    return fetchNewsletterBroadcastEmails();
  }

  const [customers, unverifiedCustomers, subscribers] = await Promise.all([
    fetchCustomerBroadcastEmails(),
    fetchUnverifiedCustomerBroadcastEmails(),
    fetchNewsletterBroadcastEmails()
  ]);
  return dedupeEmails([...customers, ...unverifiedCustomers, ...subscribers]);
};

export const broadcastAdminService = {
  getBroadcastAudienceSummary: async (): Promise<BroadcastAudienceSummaryDto> => {
    const [customers, unverifiedCustomers, newsletterSubscribers] = await Promise.all([
      fetchCustomerBroadcastEmails(),
      fetchUnverifiedCustomerBroadcastEmails(),
      fetchNewsletterBroadcastEmails()
    ]);

    return {
      customers: customers.length,
      unverifiedCustomers: unverifiedCustomers.length,
      newsletterSubscribers: newsletterSubscribers.length,
      totalUniqueRecipients: dedupeEmails([...customers, ...unverifiedCustomers, ...newsletterSubscribers]).length
    };
  },

  sendBroadcastEmail: async (payload: BroadcastCampaignInputDto, baseUrl: string): Promise<BroadcastDispatchDto> => {
    const subject = payload.subject.trim();
    const previewText = payload.previewText?.trim() || undefined;
    const headline = payload.headline.trim();
    const body = payload.body.trim();
    const ctaLabel = payload.ctaLabel?.trim() || undefined;
    const ctaUrl = resolveBroadcastCtaUrl(payload.ctaUrl, baseUrl);
    const recipients = await getBroadcastRecipientEmails(payload.audience, payload.recipientUserIds);

    if (recipients.length === 0) {
      throw new AppError('No recipients are available for this audience right now.', 400);
    }

    let sent = 0;
    let failed = 0;

    for (let index = 0; index < recipients.length; index += EMAIL_BATCH_SIZE) {
      const batch = recipients.slice(index, index + EMAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((to) =>
          emailService.sendAdminBroadcast({
            to,
            subject,
            previewText,
            headline,
            body,
            ctaLabel,
            ctaUrl,
            audienceLabel: broadcastAudienceLabels[payload.audience]
          })
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sent += 1;
        } else {
          failed += 1;
          logger.error(`admin.broadcast.delivery_failed audience=${payload.audience} error=${result.reason instanceof Error ? result.reason.message : 'unknown'}`);
        }
      }
    }

    logger.info(`admin.broadcast.sent audience=${payload.audience} requested=${recipients.length} sent=${sent} failed=${failed}`);

    return {
      audience: payload.audience,
      subject,
      requestedRecipients: recipients.length,
      sent,
      failed
    };
  }
};
