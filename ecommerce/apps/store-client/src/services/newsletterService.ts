import type { NewsletterConfirmDto, NewsletterSubscribeDto, NewsletterSubscriptionDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }) => payload.data.data;

export const newsletterService = {
  subscribe: async (payload: NewsletterSubscribeDto) => unwrap<NewsletterSubscriptionDto>(await api.post('/newsletter/subscribe', payload)),
  confirm: async (token: NewsletterConfirmDto['token']) =>
    unwrap<NewsletterSubscriptionDto>(await api.post('/newsletter/confirm', { token }))
};
