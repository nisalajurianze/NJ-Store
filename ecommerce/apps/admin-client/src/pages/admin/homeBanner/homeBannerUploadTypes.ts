import type { ChangeEvent } from 'react';
import type { FieldPath } from 'react-hook-form';
import type { HomeBannerFormValues } from './homeBannerFormModel';

export interface HomeBannerImageUploadTarget {
  uploadKey: string;
  label: string;
  urlField: FieldPath<HomeBannerFormValues>;
  publicIdField: FieldPath<HomeBannerFormValues>;
  altField: FieldPath<HomeBannerFormValues>;
  kindField?: FieldPath<HomeBannerFormValues>;
}

export type HomeBannerImageUploadHandler = (
  event: ChangeEvent<HTMLInputElement>,
  target: HomeBannerImageUploadTarget
) => Promise<void>;
