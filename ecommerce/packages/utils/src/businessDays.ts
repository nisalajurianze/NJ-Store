const BUSINESS_DAY_RANGE_PATTERN = /^(\d+)(?:\s*-\s*(\d+))?$/;

export interface BusinessDayRange {
  min: number;
  max: number;
}

export const parseBusinessDayRange = (value: string | undefined): BusinessDayRange => {
  if (!value) {
    return { min: 2, max: 5 };
  }

  const match = BUSINESS_DAY_RANGE_PATTERN.exec(value.trim());
  if (!match) {
    return { min: 2, max: 5 };
  }

  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : first;
  const min = Math.max(0, Math.min(first, second));
  const max = Math.max(0, Math.max(first, second));
  return { min, max };
};

export const addBusinessDays = (startDate: Date, businessDays: number): Date => {
  const nextDate = new Date(startDate);
  let remaining = Math.max(0, businessDays);

  while (remaining > 0) {
    nextDate.setDate(nextDate.getDate() + 1);
    const day = nextDate.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return nextDate;
};

export const formatEstimatedDeliveryWindow = (
  businessDayWindow: string | undefined,
  options?: { from?: Date; locale?: string | string[] }
): string => {
  const { min, max } = parseBusinessDayRange(businessDayWindow);
  const today = options?.from ?? new Date();
  const startDate = addBusinessDays(today, min);
  const endDate = addBusinessDays(today, max);
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = startDate.toLocaleDateString(options?.locale, dateOptions);
  const endLabel = endDate.toLocaleDateString(options?.locale, dateOptions);

  return min === max ? startLabel : `${startLabel} - ${endLabel}`;
};
