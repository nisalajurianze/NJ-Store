import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Laptop, MoonStar, PencilLine, SunMedium } from 'lucide-react';
import { Button, Card, Input, SectionHeading } from '@njstore/ui';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import { DashboardAddresses } from './Addresses';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional()
});

const getThemeMeta = (themePreference: ThemePreference): {
  Icon: typeof Laptop;
  label: string;
  description: string;
} => {
  if (themePreference === 'system') {
    return {
      Icon: Laptop,
      label: 'System',
      description: 'Using your device appearance setting.'
    };
  }

  if (themePreference === 'dark') {
    return {
      Icon: MoonStar,
      label: 'Dark',
      description: 'Dark mode is active for this browser.'
    };
  }

  return {
    Icon: SunMedium,
    label: 'Light',
    description: 'Light mode is active for this browser.'
  };
};

export const DashboardProfile = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const { user, updateProfile } = useAuth();
  const { activeCurrency, supportedCurrencies, setCurrency } = useCurrency();
  const { themePreference, setTheme } = useTheme();
  const addressesSectionRef = useRef<HTMLDivElement | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingCurrency, setIsEditingCurrency] = useState(false);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(activeCurrency.code);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' }
  });
  const themeMeta = getThemeMeta(themePreference);
  const ThemeIcon = themeMeta.Icon;

  useEffect(() => {
    form.reset({
      name: user?.name ?? '',
      phone: user?.phone ?? ''
    });
  }, [form, user]);

  useEffect(() => {
    if (!isEditingCurrency) {
      setSelectedCurrencyCode(activeCurrency.code);
    }
  }, [activeCurrency.code, isEditingCurrency]);

  useEffect(() => {
    if (searchParams.get('section') !== 'addresses') {
      return;
    }

    addressesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
        <SectionHeading
          title="Profile"
          size="compact"
          description="Keep your contact details current so quotations and delivery details stay accurate."
          action={
            !isEditingProfile ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditingProfile(true)}>
                Edit Profile
              </Button>
            ) : null
          }
        />

        {isEditingProfile ? (
          <form
            className="mt-5 grid gap-4 md:max-w-lg"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await updateProfile(values);
                setIsEditingProfile(false);
                toast.success('Profile updated');
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Unable to update your profile right now.'));
              }
            })}
          >
            <Input label="Full Name" {...form.register('name')} error={form.formState.errors.name?.message} />
            <Input label="Phone" {...form.register('phone')} error={form.formState.errors.phone?.message} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  form.reset({
                    name: user?.name ?? '',
                    phone: user?.phone ?? ''
                  });
                  setIsEditingProfile(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={form.formState.isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-5 grid gap-3 md:max-w-lg">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Full Name</p>
              <p className="mt-2 text-sm font-medium text-white">{user?.name?.trim() || 'Add your full name'}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Phone</p>
              <p className="mt-2 text-sm font-medium text-white">{user?.phone?.trim() || 'Add your phone number'}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Email</p>
              <p className="mt-2 text-sm font-medium text-white">{user?.email}</p>
            </div>
          </div>
        )}
      </Card>

      <div ref={addressesSectionRef} className="scroll-mt-24 lg:scroll-mt-28">
        <DashboardAddresses />
      </div>

      <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
        <SectionHeading
          title="Appearance"
          size="compact"
          description="Change how the storefront looks on this device."
        />
        <div className="mt-5 flex flex-col gap-4 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-gold">
              <ThemeIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Theme</p>
              <p className="mt-2 text-sm font-medium text-white">{themeMeta.label}</p>
              <p className="mt-1 text-sm leading-6 text-gray-400">{themeMeta.description}</p>
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
            {(['system', 'dark', 'light'] as const).map((option) => {
              const optionMeta = getThemeMeta(option);
              const isActive = themePreference === option;

              return (
                <Button
                  key={option}
                  type="button"
                  variant={isActive ? 'primary' : 'secondary'}
                  size="sm"
                  aria-label={`Use ${optionMeta.label} theme`}
                  aria-pressed={isActive}
                  onClick={() => setTheme(option)}
                  className="w-full"
                >
                  {optionMeta.label}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {supportedCurrencies.length > 1 ? (
        <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
          <SectionHeading
            title="Preferences"
            size="compact"
            description="Manage how prices are shown while you browse on this device."
            action={
              !isEditingCurrency ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Edit Currency"
                  onClick={() => {
                    setSelectedCurrencyCode(activeCurrency.code);
                    setIsEditingCurrency(true);
                  }}
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
              ) : null
            }
          />
          {isEditingCurrency ? (
            <form
              className="mt-6 grid gap-3 md:max-w-xl"
              onSubmit={(event) => {
                event.preventDefault();
                setCurrency(selectedCurrencyCode);
                setIsEditingCurrency(false);
                toast.success('Currency preference updated');
              }}
            >
              <label className="text-sm font-medium text-white" htmlFor="preferred-currency">
                Preferred Currency
              </label>
              <select
                id="preferred-currency"
                aria-label="Preferred Currency"
                value={selectedCurrencyCode}
                onChange={(event) => setSelectedCurrencyCode(event.target.value)}
                className="h-11 rounded-[14px] border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white outline-none transition-[border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-gold/30 focus:bg-white/[0.08] focus:ring-2 focus:ring-gold/10"
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency.code} value={currency.code} className="bg-[#07101c] text-white">
                    {currency.code}
                  </option>
                ))}
              </select>
              <p className="text-sm leading-6 text-gray-400">
                Choose a currency, then save it when you are ready.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedCurrencyCode(activeCurrency.code);
                    setIsEditingCurrency(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={selectedCurrencyCode === activeCurrency.code}>
                  Save Preference
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 max-w-xl rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Preferred Currency</p>
              <p className="mt-2 text-sm font-medium text-white">
                {activeCurrency.code}
                {activeCurrency.symbol ? <span className="ml-2 text-gray-400">({activeCurrency.symbol})</span> : null}
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Price formatting stays saved in this browser after you edit and save the preference.
              </p>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
};
