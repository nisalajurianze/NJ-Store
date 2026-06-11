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
