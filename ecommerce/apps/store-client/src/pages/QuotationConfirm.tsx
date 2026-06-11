import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, SectionHeading } from '@njstore/ui';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { getApiErrorMessage } from '../utils/apiError';
import { toast } from '../utils/lazyToast';

export const QuotationConfirm = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const attemptedRef = useRef(false);
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const primaryPath = user ? '/dashboard/orders' : '/auth/login';
  const primaryLabel = user ? 'Go to Orders' : 'Go to Login';
  const [quotationError, setQuotationError] = useState('This quotation could not be opened. It may have expired or already been converted.');
  const quotationMutation = useMutation({
    mutationFn: async () => orderService.getQuotationByToken(token)
  });

  useEffect(() => {
    if (!token || loading || attemptedRef.current || quotationMutation.isPending || quotationMutation.isSuccess) {
      return;
    }

    if (!user) {
      attemptedRef.current = true;
      navigate('/auth/login', {
        replace: true,
        state: { from: `${location.pathname}${location.search}` }
      });
      return;
    }

    if (!user.isEmailVerified) {
      attemptedRef.current = true;
      toast.error('Verify your email in profile before confirming the order.');
      navigate('/dashboard/security?section=verification', { replace: true });
      return;
    }

    attemptedRef.current = true;
    quotationMutation.mutate(undefined, {
      onSuccess: async (response) => {
        await queryClient.invalidateQueries({ queryKey: ['dashboard', 'order', response.data.id] });
        toast.success('Quotation opened');
        navigate(`/dashboard/orders/${response.data.id}`, { replace: true });
      },
      onError: (error) => {
        const message = getApiErrorMessage(error, 'Unable to open this quotation right now.');
        setQuotationError(message);
        toast.error(message);
      }
    });
  }, [loading, location.pathname, location.search, navigate, queryClient, quotationMutation, token, user]);

  return (
    <div className="page-shell page-nav-gap pb-0">
      <Card className="mx-auto w-full max-w-2xl rounded-3xl p-8">
        <SectionHeading
          title="Quotation Confirmation"
          description={
            token
              ? 'NJ Store is opening your quotation so you can choose delivery or pickup before confirming it.'
              : 'This confirmation link is missing its quotation token.'
          }
        />
        <div className="mt-6 space-y-4 text-sm text-gray-300">
          {loading ? <p>Checking your account and quotation access...</p> : null}
          {quotationMutation.isPending ? (
            <p>Your quotation is being opened now. Please keep this tab open for a moment.</p>
          ) : null}
          {quotationMutation.isError ? (
            <p>{quotationError}</p>
          ) : null}
          {!token ? <p>The confirmation link is incomplete. Use the email link again or sign in to view your dashboard orders.</p> : null}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={primaryPath}>
            <Button variant="secondary">{primaryLabel}</Button>
          </Link>
          <Link to="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
