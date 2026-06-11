import { describe, expect, it } from 'vitest';
import { sanitizeMongoPayload } from '../middleware/sanitize.js';

describe('sanitizeMongoPayload', () => {
  it('removes mongo operator keys and prototype pollution keys recursively', () => {
    const sanitized = sanitizeMongoPayload({
      name: 'Safe payload',
      $where: 'malicious',
      nested: {
        'profile.name': 'should be removed',
        details: {
          __proto__: 'blocked',
          city: 'Colombo'
        }
      },
      items: [
        {
          sku: 'SKU-1',
          'meta.hidden': 'blocked'
        }
      ]
    }) as Record<string, unknown>;

    expect(sanitized).toEqual({
      name: 'Safe payload',
      nested: {
        details: {
          city: 'Colombo'
        }
      },
      items: [
        {
          sku: 'SKU-1'
        }
      ]
    });
  });
});
