import { useCallback, useState } from 'react';

export interface ImageFallbackState {
  failedImageUrls: Record<string, true>;
  isImageFailed: (imageUrl?: string | null) => boolean;
  markImageFailed: (imageUrl?: string | null) => void;
  resetFailedImages: () => void;
}

export const useImageFallback = (): ImageFallbackState => {
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, true>>({});

  const isImageFailed = useCallback(
    (imageUrl?: string | null) => Boolean(imageUrl && failedImageUrls[imageUrl]),
    [failedImageUrls]
  );

  const markImageFailed = useCallback((imageUrl?: string | null) => {
    if (!imageUrl) {
      return;
    }

    setFailedImageUrls((current) => (current[imageUrl] ? current : { ...current, [imageUrl]: true }));
  }, []);

  const resetFailedImages = useCallback(() => {
    setFailedImageUrls({});
  }, []);

  return {
    failedImageUrls,
    isImageFailed,
    markImageFailed,
    resetFailedImages
  };
};
