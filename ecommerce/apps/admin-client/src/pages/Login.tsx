import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input, SectionHeading } from '@njstore/ui';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import { cancelGoogleIdentityPrompt, loadGoogleIdentityScript, type GoogleCredentialResponse } from '../utils/googleIdentity';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const Login = (): JSX.Element => {
  const navigate = useNavigate();
  const { login, googleLogin } = useAdminAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleLoginRef = useRef(googleLogin);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isLocalDevelopmentOrigin =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const isGoogleAuthEnabled = Boolean(googleClientId) && (!isLocalDevelopmentOrigin || import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true');
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  googleLoginRef.current = googleLogin;

  useEffect(() => {
    if (!googleClientId || !isGoogleAuthEnabled || !googleButtonRef.current) {
      return;
    }

    let cancelled = false;

    const handleCredential = async (response: GoogleCredentialResponse): Promise<void> => {
      if (!response.credential) {
        toast.error('Google authorization did not return a credential');
        return;
      }

      try {
        setIsGoogleLoading(true);
        await googleLoginRef.current({ credential: response.credential, rememberMe: true });
        toast.success('Welcome back');
        navigate('/dashboard');
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Google sign-in failed'));
      } finally {
        if (!cancelled) {
          setIsGoogleLoading(false);
        }
      }
    };

    const renderGoogleButton = (): void => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts.id) {
        return;
      }

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        auto_select: false,
        button_auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        itp_support: true,
        callback: (response) => {
          void handleCredential(response);
        }
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: Math.min(googleButtonRef.current.offsetWidth || 320, 320),
        locale: 'en'
      });
    };

    void loadGoogleIdentityScript()
      .then(renderGoogleButton)
      .catch(() => {
        if (!cancelled) {
          toast.error('Google sign-in is unavailable right now.');
        }
      });

    return () => {
      cancelled = true;
      cancelGoogleIdentityPrompt();
    };
  }, [googleClientId, isGoogleAuthEnabled, navigate]);

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-12 lg:py-16">
      <Card className="w-full max-w-lg rounded-[30px] p-6 sm:p-7 lg:p-8">
        <SectionHeading title="Admin Sign In" description="Access analytics, catalog management, and order operations." />
        <form
          className="mt-6 grid gap-5"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              form.clearErrors();
              await login({ email: values.email.trim().toLowerCase(), password: values.password });
              toast.success('Welcome back');
              navigate('/dashboard');
            } catch (error) {
              const message = getApiErrorMessage(error, 'Unable to sign in right now.');
              form.setError('password', { message });
              toast.error(message);
            }
          })}
        >
          <Input label="Email" autoComplete="email" {...form.register('email')} error={form.formState.errors.email?.message} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
            error={form.formState.errors.password?.message}
          />
          <Button type="submit" isLoading={form.formState.isSubmitting}>Login</Button>
        </form>
        {isGoogleAuthEnabled ? (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-gray-500">
              <span className="h-px flex-1 bg-white/10" />
              Or
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="mx-auto max-w-[320px]">
              <div ref={googleButtonRef} className="h-[44px] w-full overflow-hidden rounded-full bg-white leading-none" />
            </div>
            {isGoogleLoading ? <p className="text-center text-xs text-gray-500">Checking workspace access...</p> : null}
          </div>
        ) : import.meta.env.DEV ? (
          <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-gray-400">
            Add <code>VITE_GOOGLE_CLIENT_ID</code> to the admin client env and <code>GOOGLE_CLIENT_ID</code> to the server env to enable admin Google sign-in.
          </div>
        ) : null}
      </Card>
    </div>
  );
};
