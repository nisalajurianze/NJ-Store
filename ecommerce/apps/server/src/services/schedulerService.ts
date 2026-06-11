import { abandonedCartService } from './abandonedCartService.js';
import { authService } from './authService.js';
import { logger } from '../utils/logger.js';

let abandonedCartTimer: NodeJS.Timeout | null = null;
let authSecurityCleanupTimer: NodeJS.Timeout | null = null;
const AUTH_SECURITY_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export const schedulerService = {
  start: (): void => {
    if (!abandonedCartTimer) {
      const runAbandonedCartSweep = async (): Promise<void> => {
        try {
          const result = await abandonedCartService.processAbandonedCarts();
          logger.info(`scheduler.abandoned_cart.checked=${result.checked} sent=${result.sent}`);
        } catch (error) {
          logger.error(error as Error);
        }
      };

      abandonedCartTimer = setInterval(() => {
        void runAbandonedCartSweep();
      }, abandonedCartService.getIntervalMs());
    }

    if (!authSecurityCleanupTimer) {
      const runAuthSecurityCleanup = async (): Promise<void> => {
        try {
          const result = await authService.cleanupExpiredSecurityFields();
          logger.info(`scheduler.auth_security.resetTokens=${result.resetTokensCleared} locks=${result.locksCleared}`);
        } catch (error) {
          logger.error(error as Error);
        }
      };

      authSecurityCleanupTimer = setInterval(() => {
        void runAuthSecurityCleanup();
      }, AUTH_SECURITY_CLEANUP_INTERVAL_MS);

      void runAuthSecurityCleanup();
    }
  },

  stop: (): void => {
    if (abandonedCartTimer) {
      clearInterval(abandonedCartTimer);
      abandonedCartTimer = null;
    }

    if (authSecurityCleanupTimer) {
      clearInterval(authSecurityCleanupTimer);
      authSecurityCleanupTimer = null;
    }
  }
};
