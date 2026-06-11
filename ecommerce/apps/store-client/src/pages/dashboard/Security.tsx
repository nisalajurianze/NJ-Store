import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2, KeyRound, Mail, PencilLine, Phone, ShieldAlert } from 'lucide-react';
import { Badge, Button, Card, Input, SectionHeading } from '@njstore/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../utils/apiError';
import { readStorageItem, removeStorageItem, writeStorageItem } from '../../utils/browserStorage';
import { toast } from '../../utils/lazyToast';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export const DashboardSecurity = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshSession, updatePassword } = useAuth();
  const verificationSectionRef = useRef<HTMLDivElement | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [isVerificationPreviewMode, setIsVerificationPreviewMode] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const verificationRequestStorageKey = useMemo(
    () => (user?.email ? `njstore:verification-requested:${user.email}` : null),
    [user?.email]
  );
  const [hasRequestedVerification, setHasRequestedVerification] = useState(false);
  const newPassword = form.watch('newPassword') ?? '';

  const securityItems = [
    {
      title: 'Password protection',
      description: 'Use a strong password and update it whenever your account details may have been shared.',
      status: user?.authProvider === 'google' ? 'Google sign-in' : 'Password account',
      variant: 'info' as const,
      icon: KeyRound,
      action: !isEditingPassword ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => setIsEditingPassword(true)}>
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Update Password
        </Button>
      ) : null
    },
    {
      title: 'Recovery phone',
      description: user?.phone ? 'A phone number is saved for delivery and account support.' : 'Add a phone number so support can verify important account requests.',
      status: user?.phone ? 'Added' : 'Add phone',
      variant: user?.phone ? ('success' as const) : ('warning' as const),
      icon: Phone,
      action: (
        <Button type="button" size="sm" variant="ghost" onClick={() => navigate('/dashboard/profile')}>
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          Manage Details
        </Button>
      )
    }
  ];

  useEffect(() => {
    if (searchParams.get('section') !== 'verification') {
      return;
    }

    verificationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams]);

  useEffect(() => {
    if (!verificationRequestStorageKey || typeof window === 'undefined') {
      setHasRequestedVerification(false);
      return;
    }

    setHasRequestedVerification(readStorageItem(verificationRequestStorageKey, 'session') === 'true');
  }, [verificationRequestStorageKey]);

  useEffect(() => {
    if (!verificationRequestStorageKey || typeof window === 'undefined') {
      return;
    }

    if (hasRequestedVerification) {
      writeStorageItem(verificationRequestStorageKey, 'true', 'session');
    } else {
      removeStorageItem(verificationRequestStorageKey, 'session');
    }
  }, [hasRequestedVerification, verificationRequestStorageKey]);

  useEffect(() => {
    if (!user?.isEmailVerified) {
      return;
    }

    setHasRequestedVerification(false);
    setVerificationPreviewUrl(null);
    setIsVerificationPreviewMode(false);
  }, [user?.isEmailVerified]);

  useEffect(() => {
    if (!user || user.isEmailVerified) {
      return;
    }

    const syncVerificationStatus = async (): Promise<void> => {
      try {
        await refreshSession();
      } catch {
        // Auth context already handles session cleanup if refresh fails.
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncVerificationStatus();
      }
    }, 10000);

    const handleFocus = (): void => {
      if (document.visibilityState === 'visible') {
        void syncVerificationStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshSession, user]);

  return (
    <div className="space-y-6">
      <div ref={verificationSectionRef} className="scroll-mt-24 lg:scroll-mt-28">
        <Card className="rounded-[24px] border-[color:var(--theme-border-strong)] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.032))] p-4 !shadow-none sm:p-5 sm:!shadow-none">
          {user?.isEmailVerified ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-display text-[1.35rem] leading-tight text-[color:var(--theme-text-primary)] sm:text-[1.7rem]">
                    Email Verification
                  </h2>
                  <p className="mt-1.5 max-w-3xl text-[12.5px] leading-5 text-[color:var(--theme-text-secondary)] sm:text-sm">
                    Your email is confirmed for orders, receipts, and account recovery.
                  </p>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Verified account
                </span>
              </div>
              <div className="mt-4 flex min-w-0 flex-col gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--theme-text-primary)]">Email verified</p>
                    <p className="mt-0.5 break-words text-[13px] leading-5 text-[color:var(--theme-text-secondary)]">
                      <span className="font-medium text-[color:var(--theme-text-primary)]">{user.email}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[12px] text-[color:var(--theme-text-secondary)]">
                  {['Quotations', 'Receipts', 'Orders'].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-display text-[1.35rem] leading-tight text-[color:var(--theme-text-primary)] sm:text-[1.7rem]">
                    Email Verification
                  </h2>
                  <p className="mt-1.5 max-w-3xl text-[12.5px] leading-5 text-[color:var(--theme-text-secondary)] sm:text-sm">
                    Verify your email before confirming quotations or placing orders.
                  </p>
                </div>
                <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  Verification pending
                </span>
              </div>
              <div className="mt-4 rounded-[18px] border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/20">
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[color:var(--theme-text-primary)]">Verification pending</p>
                    <p className="mt-0.5 break-words text-[13px] leading-5 text-[color:var(--theme-text-secondary)]">
                      Verify <span className="font-medium text-[color:var(--theme-text-primary)]">{user?.email}</span> to protect checkout and account recovery.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    isLoading={isResendingVerification}
                    loadingLabel="Sending..."
                    onClick={async () => {
                      try {
                        setIsResendingVerification(true);
                        const result = await authService.resendVerification();
                        setVerificationPreviewUrl(result.verificationUrl ?? null);
                        setIsVerificationPreviewMode(result.previewMode);
                        setHasRequestedVerification(true);
                        toast.success(result.previewMode ? 'Verification preview is ready' : 'Verification email sent');
                      } catch (error) {
                        toast.error(
                          getApiErrorMessage(
                            error,
                            hasRequestedVerification
                              ? 'Unable to resend verification email right now.'
                              : 'Unable to send verification email right now.'
                          )
                        );
                      } finally {
                        setIsResendingVerification(false);
                      }
                    }}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {hasRequestedVerification ? 'Resend Verification' : 'Verify Email'}
                  </Button>
                  {verificationPreviewUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        window.open(verificationPreviewUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Open Verification Link
                    </Button>
                  ) : null}
                </div>
                {hasRequestedVerification && !isVerificationPreviewMode ? (
                  <p className="mt-2 text-xs leading-5 text-amber-200/85">
                    Verification status updates automatically here after you complete the email link.
                  </p>
                ) : null}
                {isVerificationPreviewMode ? (
                  <p className="mt-2 text-xs leading-5 text-amber-200/85">
                    Local preview mode is active on this machine, so the verification link opens directly here instead of waiting for a mailbox delivery.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
        <SectionHeading
          title="Security"
          description="Keep your account protected with a strong password and verified recovery details."
          action={
            !isEditingPassword ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditingPassword(true)}>
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                Edit Password
              </Button>
            ) : null
          }
        />

        {isEditingPassword ? (
          <form
            className="mt-6 grid gap-5"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await updatePassword(values);
                toast.success('Password updated, please log in again');
                navigate('/auth/login');
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Unable to update your password right now.'));
              }
            })}
          >
            <Input label="Current Password" type="password" {...form.register('currentPassword')} error={form.formState.errors.currentPassword?.message} />
            <Input label="New Password" type="password" {...form.register('newPassword')} error={form.formState.errors.newPassword?.message} />
            <PasswordStrengthMeter password={newPassword} compact />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  form.reset();
                  setIsEditingPassword(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={form.formState.isSubmitting} loadingLabel="Updating...">
                Update Password
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card className="rounded-[28px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
        <SectionHeading
          title="Account Protection"
          description="Review the essentials that protect checkout, receipts, and account recovery."
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {securityItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex min-h-[178px] flex-col justify-between rounded-[22px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant={item.variant}>{item.status}</Badge>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-[color:var(--theme-text-primary)]">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-5 text-[color:var(--theme-text-secondary)]">{item.description}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.action}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-400/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[color:var(--theme-text-primary)]">Secure checkout</p>
                <p className="mt-1 text-[13px] leading-5 text-[color:var(--theme-text-secondary)]">
                  Verified email and account details help keep order confirmation tied to you.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[20px] border border-blue-400/15 bg-blue-400/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-300 ring-1 ring-blue-400/20">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[color:var(--theme-text-primary)]">Account support</p>
                <p className="mt-1 text-[13px] leading-5 text-[color:var(--theme-text-secondary)]">
                  Keep your recovery details current so support can verify important requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
