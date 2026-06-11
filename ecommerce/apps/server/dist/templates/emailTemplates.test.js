import { describe, expect, it } from 'vitest';
import { renderAdminBroadcastEmail, renderPasswordResetEmail } from './emailTemplates.js';
describe('email templates', () => {
    it('renders the polished password reset layout', () => {
        const html = renderPasswordResetEmail("NJ' ANU", 'https://example.com/reset');
        expect(html).toContain('background: #F3F6FB');
        expect(html).toContain('Reset your password');
        expect(html).toContain('Reset Password');
        expect(html).toContain('Security note');
        expect(html).toContain('NJ&#39; ANU');
    });
    it('escapes dynamic broadcast labels and content', () => {
        const html = renderAdminBroadcastEmail({
            audienceLabel: 'VIP <script>',
            headline: 'Launch update',
            previewText: 'New <deals>',
            body: 'Use <b>bold</b> text safely.'
        });
        expect(html).toContain('VIP &lt;script&gt;');
        expect(html).toContain('New &lt;deals&gt;');
        expect(html).toContain('Use &lt;b&gt;bold&lt;/b&gt; text safely.');
        expect(html).not.toContain('VIP <script>');
        expect(html).not.toContain('<b>bold</b>');
    });
});
