export interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  button_auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
}

export interface GoogleButtonConfiguration {
  theme?: string;
  size?: string;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: string;
  width?: number;
  locale?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

let googleIdentityScriptPromise: Promise<void> | null = null;

const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=en';
const GOOGLE_IDENTITY_SCRIPT_SELECTOR = 'script[src^="https://accounts.google.com/gsi/client"]';
const GOOGLE_IDENTITY_SCRIPT_TIMEOUT_MS = 10_000;

export const loadGoogleIdentityScript = async (): Promise<void> => {
  if (window.google?.accounts.id) {
    return;
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(GOOGLE_IDENTITY_SCRIPT_SELECTOR);
      const timeoutId = window.setTimeout(() => {
        googleIdentityScriptPromise = null;
        reject(new Error('Google Identity Services timed out while loading.'));
      }, GOOGLE_IDENTITY_SCRIPT_TIMEOUT_MS);

      const resolveWhenReady = (): void => {
        window.clearTimeout(timeoutId);
        if (window.google?.accounts.id) {
          resolve();
          return;
        }

        googleIdentityScriptPromise = null;
        reject(new Error('Google Identity Services loaded without initializing.'));
      };

      const handleLoad = (): void => resolveWhenReady();
      const handleError = (): void => {
        window.clearTimeout(timeoutId);
        googleIdentityScriptPromise = null;
        reject(new Error('Unable to load Google Identity Services.'));
      };

      if (existingScript) {
        if (existingScript.dataset.googleIdentityLoaded === 'true') {
          resolveWhenReady();
          return;
        }

        existingScript.addEventListener('load', handleLoad, { once: true });
        existingScript.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', (event) => {
        (event.currentTarget as HTMLScriptElement).dataset.googleIdentityLoaded = 'true';
        handleLoad();
      }, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.body.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
};

export const cancelGoogleIdentityPrompt = (): void => {
  window.google?.accounts.id.cancel?.();
};
