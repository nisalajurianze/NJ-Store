import type { SiteConfigDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): T => payload.data.data;

export const siteConfigService = {
  get: async () => unwrap<SiteConfigDto>(await api.get('/site-config'))
};
