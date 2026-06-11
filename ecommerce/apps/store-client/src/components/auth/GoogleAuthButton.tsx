import { useEffect, useRef, useState } from 'react';
import { cn } from '@njstore/utils/cn';
import { useLocation, useNavigate } from 'react-router-dom';
import { analytics } from '../../analytics/analytics';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';
import {
  cancelGoogleIdentityPrompt,
  loadGoogleIdentityScript,
  type GoogleCredentialResponse
} from '../../utils/googleIdentity';

interface GoogleAuthButtonProps {
  rememberMe?: boolean;
  className?: string;
  context?: 'signin' | 'signup';
}

export const GoogleAuthButton = ({
  rememberMe = false,
  className,
  context = 'signin'
}: GoogleAuthButtonProps): JSX.Element | null => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isLocalDevelopmentOrigin =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const isGoogleAuthEnabled = Boolean(clientId) && (!isLocalDevelopmentOrigin || import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true');
  const navigate = useNavigate();
  const location = useLocation();
  const { googleLogin } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const rememberMeRef = useRef(rememberMe);
  const googleLoginRef = useRef(googleLogin);
  const redirectToRef = useRef((location.state as { from?: string } | null)?.from ?? '/dashboard');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const buttonText = context === 'signup' ? 'signup_with' : 'signin_with';

  rememberMeRef.current = rememberMe;
  googleLoginRef.current = googleLogin;
  redirectToRef.current = redirectTo;

  useEffect(() => {
    if (!clientId || !isGoogleAuthEnabled || !googleButtonRef.current) {
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
        await googleLoginRef.current({ credential: response.credential, rememberMe: rememberMeRef.current });
        if (context === 'signup') {
          analytics.trackSignUp('google');
        } else {
          analytics.trackSignIn('google');
        }
        toast.success('Signed in with Google');
        navigate(redirectToRef.current);
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
        client_id: clientId,
        auto_select: false,
        button_auto_select: false,
        cancel_on_tap_outside: true,
        context,
        itp_support: true,
        callback: (response) => {
          void handleCredential(response);
        }
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: buttonText,
        shape: 'pill',
        width: Math.min(googleButtonRef.current.offsetWidth || 320, 320),
        locale: 'en'
      });
    };

    void loadGoogleIdentityScript()
      .then(() => {
        renderGoogleButton();
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Google sign-in is unavailable right now.');
        }
      });

    return () => {
      cancelled = true;
      cancelGoogleIdentityPrompt();
    };
  }, [buttonText, clientId, context, isGoogleAuthEnabled, navigate]);

  if (!clientId || !isGoogleAuthEnabled) {
    if (!import.meta.env.DEV) {
      return null;
    }

    const isPausedForLocalDev = Boolean(clientId) && !isGoogleAuthEnabled;

    return (
      <div
        className={cn(
          'google-auth-setup-card mt-6 hidden space-y-3 rounded-[24px] border p-4 sm:block sm:p-5',
          className
        )}
      >
        <div className="google-auth-setup-kicker flex items-center gap-3 text-xs uppercase tracking-[0.25em]">
          <span className="google-auth-setup-rule h-px flex-1" />
          Google sign-in setup needed
          <span className="google-auth-setup-rule h-px flex-1" />
        </div>
        <p className="google-auth-setup-copy text-sm leading-6">
          {isPausedForLocalDev ? (
            <>
              Google sign-in is paused on localhost so an unapproved Google OAuth origin does not throw console errors.
            </>
          ) : (
            <>
              Google sign-in is hidden because <code>VITE_GOOGLE_CLIENT_ID</code> is empty in the storefront environment.
            </>
          )}
        </p>
        <p className="google-auth-setup-note text-xs leading-5">
          {isPausedForLocalDev ? (
            <>
              Add <code>http://localhost:5173</code> to the Google Web Client authorized JavaScript origins, then set{' '}
              <code>VITE_ENABLE_GOOGLE_AUTH=true</code> in <code>apps/store-client/.env</code> and restart the dev server.
            </>
          ) : (
            <>
              Add the same Google Web Client ID to <code>apps/store-client/.env</code> as <code>VITE_GOOGLE_CLIENT_ID</code> and to{' '}
              <code>apps/server/.env</code> as <code>GOOGLE_CLIENT_ID</code>, then restart the dev servers.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('mt-5 space-y-2.5', className)}>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-gray-500">
        <span className="h-px flex-1 bg-white/10" />
        Or
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="mx-auto max-w-[320px]">
        <div ref={googleButtonRef} className="h-[44px] w-full overflow-hidden rounded-full bg-white leading-none" />
      </div>
      {isGoogleLoading ? <p className="text-center text-xs text-gray-500">Signing you in...</p> : null}
    </div>
  );
};
