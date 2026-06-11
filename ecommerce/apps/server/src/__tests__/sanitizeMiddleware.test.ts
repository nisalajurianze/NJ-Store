import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { sanitizeMongoPayload, sanitizeXssPayload, xssSanitize } from '../middleware/sanitize.js';

describe('sanitize middleware helpers', () => {
  it('removes Mongo operator and prototype-pollution keys recursively', () => {
    const payload = sanitizeMongoPayload({
      name: 'Phone',
      $where: 'evil()',
      nested: {
        'profile.role': 'admin',
        safe: 'value',
        __proto__: { polluted: true }
      }
    });

    expect(payload).toEqual({
      name: 'Phone',
      nested: {
        safe: 'value'
      }
    });
  });

  it('sanitizes scriptable HTML without depending on express-xss-sanitizer', () => {
    const payload = sanitizeXssPayload({
      title: '<script>alert(1)</script><p>Safe</p>',
      tags: ['<img src=x onerror=alert(1)>', 'normal']
    });

    expect(payload).toEqual({
      title: '<p>Safe</p>',
      tags: ['', 'normal']
    });
  });

  it('sanitizes request body, params, headers, and query', () => {
    const req = {
      body: { name: '<p>Safe</p><script>alert(1)</script>' },
      params: { id: '<strong>abc</strong>' },
      headers: { 'x-test': '<script>alert(1)</script>ok' },
      query: { q: '<img src=x onerror=alert(1)>phone' }
    } as unknown as Request;
    const next = vi.fn();

    xssSanitize(req, {} as Response, next);

    expect(req.body).toEqual({ name: '<p>Safe</p>' });
    expect(req.params).toEqual({ id: '<strong>abc</strong>' });
    expect(req.headers['x-test']).toBe('ok');
    expect(req.query).toEqual({ q: 'phone' });
    expect(next).toHaveBeenCalledOnce();
  });
});
