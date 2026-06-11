import type { BannerDto } from '@njstore/types';
import api from './api';

const unwrap = <T>(payload: { data: { data: T } }): { data: T } => ({
  data: payload.data.data
});

export const bannerService = {
  homeHero: async () => unwrap<BannerDto>(await api.get('/banners/home-hero'))
};
