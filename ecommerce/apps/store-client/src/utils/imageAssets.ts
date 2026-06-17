export const isKnownUnavailableDemoAsset = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'res.cloudinary.com' && parsedUrl.pathname.startsWith('/demo/');
  } catch {
    return url.includes('res.cloudinary.com/demo/');
  }
};

export const replaceCloudinaryUploadTransform = (url: string, transform: string): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  return url.replace(/\/upload\/(?:[a-zA-Z0-9_]+,[a-zA-Z0-9_]+\/)?/, `/upload/${transform}/`);
};

export const buildCloudinaryImageSrcSet = (url: string, widths: readonly number[], baseTransform = 'f_auto,q_auto'): string => {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return '';
  }

  return widths.map((width) => `${replaceCloudinaryUploadTransform(url, `${baseTransform},w_${width}`)} ${width}w`).join(', ');
};
