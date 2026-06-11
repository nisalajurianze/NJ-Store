interface DownloadBlobOptions {
  revokeAfterMs?: number;
}

const DEFAULT_BLOB_REVOKE_DELAY_MS = 60_000;

const appendDownloadAnchor = (url: string, filename: string): HTMLAnchorElement => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  return anchor;
};

export const downloadUrl = (url: string, filename: string): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const anchor = appendDownloadAnchor(url, filename);
  anchor.click();
  anchor.remove();
};

export const downloadBlob = (blob: Blob, filename: string, options?: DownloadBlobOptions): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const blobUrl = window.URL.createObjectURL(blob);
  downloadUrl(blobUrl, filename);

  let isRevoked = false;
  let timeoutId: number | undefined;
  const revoke = (): void => {
    if (isRevoked) {
      return;
    }

    isRevoked = true;
    window.URL.revokeObjectURL(blobUrl);
    window.removeEventListener('focus', revoke);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };

  window.addEventListener('focus', revoke, { once: true });
  timeoutId = window.setTimeout(revoke, options?.revokeAfterMs ?? DEFAULT_BLOB_REVOKE_DELAY_MS);
};

export const buildTrackingUrl = (trackingNumber: string): string => {
  const normalizedTrackingNumber = trackingNumber.trim();
  const encodedTrackingNumber = encodeURIComponent(normalizedTrackingNumber);

  if (normalizedTrackingNumber.startsWith('EX')) {
    return `https://www.slpost.gov.lk/tracking/?id=${encodedTrackingNumber}`;
  }

  if (normalizedTrackingNumber.startsWith('DX')) {
    return `https://www.domex.lk/tracking.php?no=${encodedTrackingNumber}`;
  }

  return `https://www.google.com/search?q=${encodedTrackingNumber}`;
};
