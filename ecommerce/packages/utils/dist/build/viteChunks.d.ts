export type VendorChunkGroups = Record<string, readonly string[]>;
export declare function getNodeModulePackageName(id: string): string | undefined;
export declare function createVendorManualChunks(groups: VendorChunkGroups): (id: string) => string | undefined;
