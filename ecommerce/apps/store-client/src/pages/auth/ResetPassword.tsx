import { useDeferredValue } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input } from '@njstore/ui';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { AuthShell } from '../../components/auth/AuthShell';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import { passwordSchema } from '../../utils/passwordStrength';

const schema = z.object({ password: passwordSchema });

export const ResetPassword = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const isTokenMissing = token.length === 0;
  const form = useForm<{ password: string }>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: ''
    }
  });
  const password = useWatch({
    control: form.control,
    name: 'password'
  }) ?? '';
  const deferredPassword = useDeferredValue(password);

  return (
    <AuthShell
      heroTitle=""
      heroDescription=""
      heroStats={[]}
      heroHighlights={[]}
      quote=""
      quoteAttribution=""
      layout="centered"
    >
      <Card className="auth-card-surface mx-auto w-full max-w-lg rounded-[26px] p-5 sm:p-6">
        <AuthCardHeader
          title="Reset password"
          description={
            isTokenMissing
              ? 'This reset link is incomplete. Request a fresh email and we will send you a new one.'
              : 'Choose a new secure password for your NJ Store account.'
          }
          topSlot={
            <p className="text-sm text-gray-400">
              Need a new link?{' '}
              <Link to="/auth/forgot-password" className="font-medium text-white transition-colors duration-200 hover:text-gold">
                Request reset email
              </Link>
            </p>
          }
        />

        {isTokenMissing ? (
          <div className="auth-warning-panel mt-4 rounded-[22px] border p-4 text-sm leading-7">
            This page needs a valid reset token from your email. Use the recovery flow again if the link was copied incorrectly or has expired.
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await authService.resetPassword(token, values.password);
                toast.success('Password reset successful');
                form.reset();
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Unable to reset your password right now.'));
              }
            })}
          >
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />
            <PasswordStrengthMeter password={deferredPassword} compact />
            <Button type="submit" className="w-full" isLoading={form.formState.isSubmitting}>
              Update Password
            </Button>
          </form>
        )}
      </Card>
    </AuthShell>
  );
};
