import { useEffect, useRef, useState } from 'react';
import { Button, Card, SectionHeading } from '@njstore/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../utils/apiError';
import { writeStorageItem } from '../../utils/browserStorage';
import { toast } from '../../utils/lazyToast';

type VerificationState = 'processing' | 'success' | 'error';

export const VerifyEmail = (): JSX.Element => {
  const navigate = useNavigate();
  const { refreshSession, user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<VerificationState>(token ? 'processing' : 'error');
  const [message, setMessage] = useState(
    token
      ? 'We are confirming your email now. This tab will close or return you automatically when finished.'
      : 'This verification link is missing its token. Please request a new email verification link.'
  );
  const [redirectPath, setRedirectPath] = useState('/auth/login');
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (!token || hasProcessedRef.current) {
      return;
    }

    hasProcessedRef.current = true;

    void (async () => {
      try {
        await authService.verifyEmail(token);
        const refreshedToken = await refreshSession();
        const nextPath = refreshedToken ? '/dashboard/security?section=verification' : '/auth/login?verified=1';

        setRedirectPath(nextPath);
        setStatus('success');
        setMessage('Email verified successfully. This tab will close automatically if your browser allows it.');

        writeStorageItem('njstore:email-verified-event', String(Date.now()));
        toast.success('Email verified successfully');

        window.setTimeout(() => {
          try {
            window.close();
          } catch {
            // Fall back to in-app redirect below.
          }

          window.setTimeout(() => {
            if (!window.closed) {
              navigate(nextPath, { replace: true });
            }
          }, 150);
        }, 1200);
      } catch (error) {
        setStatus('error');
        setMessage(getApiErrorMessage(error, 'This verification link is invalid or has already been used.'));
      }
    })();
  }, [navigate, refreshSession, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(26,58,110,0.35),_transparent_42%),linear-gradient(180deg,#0b1730_0%,#091225_100%)] px-6 py-12">
      <Card className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#182746]/95 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <SectionHeading
          title={status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Unavailable' : 'Verifying Email'}
          description={message}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          {status === 'success' ? (
            <Button type="button" onClick={() => navigate(redirectPath, { replace: true })}>
              Continue
            </Button>
          ) : null}
          {status === 'error' && user ? (
            <Button type="button" onClick={() => navigate('/dashboard/security?section=verification', { replace: true })}>
              Back to Verification
            </Button>
          ) : null}
          {status !== 'processing' ? (
            <Button type="button" variant="secondary" onClick={() => navigate('/auth/login', { replace: true })}>
              Go to Login
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
};
