import { describe, expect, it } from 'vitest';
import { adminPermissions } from '@njstore/types';
import { getFirstAccessibleAdminPath, getVisibleAdminNavigationLinks } from '../config/adminNavigation';
import { getEffectiveAdminPermissions, hasAllAdminPermissions } from './adminPermissions';

describe('admin permissions helpers', () => {
  it('falls back to the full permission set for legacy admins without explicit permissions', () => {
    expect(
      getEffectiveAdminPermissions({
        role: 'admin'
      })
    ).toEqual([...adminPermissions]);
  });

  it('treats empty admin permissions as inherited full admin access', () => {
    expect(
      getEffectiveAdminPermissions({
        role: 'admin',
        permissions: []
      })
    ).toEqual([...adminPermissions]);
  });

  it('matches required permissions exactly', () => {
    expect(hasAllAdminPermissions(['product:read', 'product:write'], ['product:read'])).toBe(true);
    expect(hasAllAdminPermissions(['product:read'], ['product:write'])).toBe(false);
  });

  it('derives the first accessible admin page from the available permissions', () => {
    const limitedLinks = getVisibleAdminNavigationLinks(['product:read']);

    expect(limitedLinks.map((link) => link.to)).toEqual(['/dashboard/products', '/dashboard/inventory', '/dashboard/product-questions', '/dashboard/reviews']);
    expect(getFirstAccessibleAdminPath(['product:read'])).toBe('/dashboard/products');
  });
});
