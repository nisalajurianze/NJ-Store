interface DownloadBlobOptions {
    revokeAfterMs?: number;
}
export declare const downloadUrl: (url: string, filename: string) => void;
export declare const downloadBlob: (blob: Blob, filename: string, options?: DownloadBlobOptions) => void;
export declare const buildTrackingUrl: (trackingNumber: string) => string;
export {};
