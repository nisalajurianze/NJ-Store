export declare const getRefreshFailureStatus: (error: unknown) => number | null;
export declare const isInvalidSessionRefreshFailure: (error: unknown) => boolean;
export declare const isTransientRefreshFailure: (error: unknown) => boolean;
export declare const waitForRefreshRetry: (delayMs?: number) => Promise<void>;
