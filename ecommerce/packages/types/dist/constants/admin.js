export const adminPermissions = [
    'product:read',
    'product:write',
    'product:delete',
    'brand:read',
    'brand:write',
    'brand:delete',
    'order:read',
    'order:write',
    'order:delete',
    'user:read',
    'user:write',
    'user:delete',
    'category:read',
    'category:write',
    'category:delete',
    'setting:read',
    'setting:write',
    'coupon:read',
    'coupon:write',
    'coupon:delete'
];
export const staffDefaultPermissions = ['order:read', 'order:write'];
export const adminPermissionGroups = [
    {
        key: 'product',
        label: 'Products',
        permissions: ['product:read', 'product:write', 'product:delete']
    },
    {
        key: 'brand',
        label: 'Brands',
        permissions: ['brand:read', 'brand:write', 'brand:delete']
    },
    {
        key: 'order',
        label: 'Orders',
        permissions: ['order:read', 'order:write', 'order:delete']
    },
    {
        key: 'user',
        label: 'Users',
        permissions: ['user:read', 'user:write', 'user:delete']
    },
    {
        key: 'category',
        label: 'Categories',
        permissions: ['category:read', 'category:write', 'category:delete']
    },
    {
        key: 'setting',
        label: 'Settings',
        permissions: ['setting:read', 'setting:write']
    },
    {
        key: 'coupon',
        label: 'Coupons',
        permissions: ['coupon:read', 'coupon:write', 'coupon:delete']
    }
];
