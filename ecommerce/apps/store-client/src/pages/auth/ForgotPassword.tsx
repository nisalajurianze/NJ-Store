import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input } from '@njstore/ui';
import { Link } from 'react-router-dom';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { AuthShell } from '../../components/auth/AuthShell';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import { warmStoreRoute } from '../../app/routeWarmup';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });

export const ForgotPassword = (): JSX.Element => {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: ''
    }
  });

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
          title="Forgot password"
          description="We will email a secure reset link if the account exists."
        />

        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await authService.forgotPassword(values.email.trim().toLowerCase());
              toast.success('Reset email sent if the account exists');
              form.reset();
            } catch (error) {
              toast.error(getApiErrorMessage(error, 'Unable to send a reset email right now.'));
            }
          })}
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <Button type="submit" className="w-full" isLoading={form.formState.isSubmitting}>
            Send Reset Link
          </Button>

          <p className="text-center text-sm text-gray-400">
            Remembered it?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-white transition-colors duration-200 hover:text-gold"
              onPointerEnter={() => warmStoreRoute('auth-login')}
              onFocus={() => warmStoreRoute('auth-login')}
              onTouchStart={() => warmStoreRoute('auth-login')}
            >
              Back to login
            </Link>
          </p>
        </form>
      </Card>
    </AuthShell>
  );
};
