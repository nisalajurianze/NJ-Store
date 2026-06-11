import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from './analytics';

export const AnalyticsRuntime = (): null => {
  const location = useLocation();
  const { user } = useAuth();
  const lastTrackedRouteRef = useRef<string | null>(null);
  const lastIdentifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    analytics.captureAcquisition();
  }, []);

  useEffect(() => {
    const routeKey = `${location.pathname}${location.search}`;
    if (lastTrackedRouteRef.current === routeKey) {
      return;
    }

    lastTrackedRouteRef.current = routeKey;
    analytics.trackPageView(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (user?.id) {
      if (lastIdentifiedUserIdRef.current === user.id) {
        return;
      }

      analytics.identify(user);
      lastIdentifiedUserIdRef.current = user.id;
      return;
    }

    if (lastIdentifiedUserIdRef.current !== null) {
      analytics.clearIdentity();
      lastIdentifiedUserIdRef.current = null;
    }
  }, [user]);

  return null;
};
