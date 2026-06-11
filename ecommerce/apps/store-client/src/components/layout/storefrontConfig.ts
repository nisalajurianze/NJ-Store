export const DEFAULT_SUPPORT_PHONE_NUMBER = '+94 11 245 8899';
export const DEFAULT_SUPPORT_PHONE_TEL = 'tel:+94112458899';
export const DEFAULT_SUPPORT_WHATSAPP_NUMBER = '94112458899';
export const DEFAULT_MAINTENANCE_MESSAGE = "We're making a few improvements right now. Please check back shortly.";
export const SUPPORT_WHATSAPP_MESSAGE = 'Hi NJ Store, I need some help with my order.';

export const buildWhatsAppUrl = (phoneNumber: string, message: string): string =>
  `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

export const normalizeDisplayPhone = (value?: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_SUPPORT_PHONE_NUMBER;
};

export const normalizeDialTarget = (value?: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_SUPPORT_PHONE_TEL;
  }

  if (trimmed.startsWith('tel:')) {
    return trimmed;
  }

  const compact = trimmed.replace(/[^\d+]/g, '');
  return compact.length >= 7 ? `tel:${compact}` : DEFAULT_SUPPORT_PHONE_TEL;
};

export const normalizeWhatsAppNumber = (value?: string): string => {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : DEFAULT_SUPPORT_WHATSAPP_NUMBER;
};
