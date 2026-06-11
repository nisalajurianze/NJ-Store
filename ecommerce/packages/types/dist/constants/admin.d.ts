export declare const adminPermissions: readonly ["product:read", "product:write", "product:delete", "brand:read", "brand:write", "brand:delete", "order:read", "order:write", "order:delete", "user:read", "user:write", "user:delete", "category:read", "category:write", "category:delete", "setting:read", "setting:write", "coupon:read", "coupon:write", "coupon:delete"];
export type AdminPermission = (typeof adminPermissions)[number];
export declare const staffDefaultPermissions: readonly ["order:read", "order:write"];
export interface AdminPermissionGroup {
    key: 'product' | 'brand' | 'order' | 'user' | 'category' | 'setting' | 'coupon';
    label: string;
    permissions: readonly AdminPermission[];
}
export declare const adminPermissionGroups: readonly AdminPermissionGroup[];
