import { useDeferredValue } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input } from '@njstore/ui';
import { Link, useNavigate } from 'react-router-dom';
import { analytics } from '../../analytics/analytics';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { AuthShell } from '../../components/auth/AuthShell';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import { passwordSchema } from '../../utils/passwordStrength';
import { warmStoreRoute } from '../../app/routeWarmup';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(100),
    email: z.string().trim().email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password')
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type Values = z.infer<typeof schema>;

export const Register = (): JSX.Element => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' }
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
          title="Create account"
          description="A few details and you are ready to shop."
        />

        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              form.clearErrors();
              await register({
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                password: values.password
              });
              analytics.trackSignUp('password');
              toast.success('Account created. Check your email to verify your address.');
              navigate('/dashboard');
            } catch (error) {
              const message = getApiErrorMessage(error, 'Unable to create your account right now.');
              if (message.toLowerCase().includes('email')) {
                form.setError('email', { message });
              } else if (message.toLowerCase().includes('password')) {
                form.setError('password', { message });
              }
              toast.error(message);
            }
          })}
        >
          <Input label="Full Name" autoComplete="name" {...form.register('name')} error={form.formState.errors.name?.message} />
          <Input label="Email" type="email" autoComplete="email" {...form.register('email')} error={form.formState.errors.email?.message} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />
          <PasswordStrengthMeter password={deferredPassword} compact />
          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
            error={form.formState.errors.confirmPassword?.message}
          />

          <Button type="submit" className="w-full" isLoading={form.formState.isSubmitting}>
            Create account
          </Button>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-white transition-colors duration-200 hover:text-gold"
              onPointerEnter={() => warmStoreRoute('auth-login')}
              onFocus={() => warmStoreRoute('auth-login')}
              onTouchStart={() => warmStoreRoute('auth-login')}
            >
              Sign in
            </Link>
          </p>
        </form>

        <GoogleAuthButton context="signup" />
      </Card>
    </AuthShell>
  );
};
