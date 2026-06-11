import { useFieldArray, type Control } from 'react-hook-form';
import type { HomeBannerFormValues } from './homeBannerFormModel';

export const useHomeBannerFieldArrays = (control: Control<HomeBannerFormValues>) => {
  const adSlots = useFieldArray({
    control,
    name: 'adSlots'
  });
  const slot0Media = useFieldArray({
    control,
    name: 'adSlots.0.mediaItems'
  });
  const slot1Media = useFieldArray({
    control,
    name: 'adSlots.1.mediaItems'
  });
  const slot2Media = useFieldArray({
    control,
    name: 'adSlots.2.mediaItems'
  });
  const featurePromoMedia = useFieldArray({
    control,
    name: 'featurePromo.mediaItems'
  });

  return {
    adSlotFields: adSlots.fields,
    adSlotMediaArrays: [slot0Media, slot1Media, slot2Media] as const,
    featurePromoMediaArray: featurePromoMedia
  };
};
