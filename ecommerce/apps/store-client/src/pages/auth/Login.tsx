import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input } from '@njstore/ui';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { analytics } from '../../analytics/analytics';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { AuthShell } from '../../components/auth/AuthShell';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { warmStoreRoute } from '../../app/routeWarmup';

// No custom Google types needed here anymore

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean().optional()
});

type Values = z.infer<typeof schema>;

export const Login = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false }
  });
  const rememberMe = useWatch({
    control: form.control,
    name: 'rememberMe'
  }) ?? false;

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      toast.success('Email verified successfully. You can sign in now.');
    }
  }, [searchParams]);


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
          title="Sign in"
          description="Use your email and password, or continue with Google."
        />

        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              form.clearErrors();
              await login({
                email: values.email.trim().toLowerCase(),
                password: values.password,
                rememberMe: values.rememberMe
              });
              analytics.trackSignIn('password');
              toast.success('Signed in');
              navigate(redirectTo);
            } catch (error) {
              const message = getApiErrorMessage(error, 'Unable to sign in right now.');
              form.setError('password', { message });
              toast.error(message);
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
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-3 text-sm text-gray-300">
              <input
                type="checkbox"
                aria-label="Remember me on this device"
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-gold"
                {...form.register('rememberMe')}
              />
              Remember me on this device
            </label>

            <Link
              to="/auth/forgot-password"
              className="text-sm font-medium text-gold transition-colors duration-200 hover:text-gold-light"
              onPointerEnter={() => warmStoreRoute('auth-forgot-password')}
              onFocus={() => warmStoreRoute('auth-forgot-password')}
              onTouchStart={() => warmStoreRoute('auth-forgot-password')}
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={form.formState.isSubmitting}>
            Sign in
          </Button>

          <p className="text-center text-sm text-gray-400">
            New here?{' '}
            <Link
              to="/auth/register"
              className="font-medium text-white transition-colors duration-200 hover:text-gold"
              onPointerEnter={() => warmStoreRoute('auth-register')}
              onFocus={() => warmStoreRoute('auth-register')}
              onTouchStart={() => warmStoreRoute('auth-register')}
            >
              Create account
            </Link>
          </p>
        </form>

        <GoogleAuthButton rememberMe={rememberMe} />
      </Card>
    </AuthShell>
  );
};
