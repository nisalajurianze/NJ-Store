const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeUrl = (value: string): string => escapeHtml(value);

const paragraph = (content: string): string =>
  `<p style="margin: 0 0 18px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.7; color: #344054;">${content}</p>`;

const mutedParagraph = (content: string): string =>
  `<p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #667085;">${content}</p>`;

const eyebrow = (content: string): string =>
  `<p style="margin: 0 0 12px; font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #B38B13;">${escapeHtml(content)}</p>`;

const renderButton = (href: string, label: string, variant: 'primary' | 'secondary' = 'primary'): string => {
  const primaryStyles =
    'background: #D4AF37; border: 1px solid #D4AF37; color: #101828; box-shadow: 0 12px 24px rgba(212, 175, 55, 0.28);';
  const secondaryStyles = 'background: #ffffff; border: 1px solid #D0D5DD; color: #0A1F44;';

  return `
    <a href="${escapeUrl(href)}" style="display: inline-block; margin: 0 10px 12px 0; padding: 14px 22px; border-radius: 999px; ${variant === 'primary' ? primaryStyles : secondaryStyles} font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; line-height: 1; text-decoration: none;">
      ${escapeHtml(label)}
    </a>
  `;
};

const actionRow = (buttons: string): string => `<div style="margin: 30px 0 26px;">${buttons}</div>`;

const notice = (label: string, content: string): string => `
  <div style="margin: 26px 0 0; padding: 16px 18px; border: 1px solid #E4E7EC; border-radius: 16px; background: #F8FAFC;">
    <p style="margin: 0 0 5px; font-family: Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #0A1F44;">${escapeHtml(label)}</p>
    ${mutedParagraph(content)}
  </div>
`;

const detailRow = (label: string, value: string): string => `
  <tr>
    <td style="padding: 12px 0; border-bottom: 1px solid #EAECF0; font-family: Arial, sans-serif; font-size: 14px; color: #667085;">${escapeHtml(label)}</td>
    <td align="right" style="padding: 12px 0; border-bottom: 1px solid #EAECF0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; color: #101828;">${escapeHtml(value)}</td>
  </tr>
`;

const detailTable = (rows: string): string => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 22px 0 26px; border-collapse: collapse;">
    ${rows}
  </table>
`;

export const renderBaseTemplate = (title: string, body: string): string => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        @media screen and (max-width: 620px) {
          .nj-shell { padding: 24px 12px !important; }
          .nj-card-heading, .nj-card-body, .nj-card-footer { padding-left: 24px !important; padding-right: 24px !important; }
          .nj-title { font-size: 28px !important; line-height: 1.16 !important; }
          .nj-topline td { display: block !important; width: 100% !important; text-align: left !important; }
          .nj-topline .nj-meta { padding-top: 10px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: #F3F6FB;">
      <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
        ${escapeHtml(title)} from NJ Store
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #F3F6FB;">
        <tr>
          <td align="center" class="nj-shell" style="padding: 44px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 640px; border-collapse: collapse;">
              <tr>
                <td style="padding: 0 4px 18px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="nj-topline" style="border-collapse: collapse;">
                    <tr>
                      <td style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 800; color: #0A1F44;">
                        NJ Store
                      </td>
                      <td align="right" class="nj-meta" style="font-family: Arial, sans-serif; font-size: 13px; color: #667085;">
                        Secure account email
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background: #ffffff; border: 1px solid #E4E7EC; border-radius: 28px; overflow: hidden; box-shadow: 0 18px 45px rgba(16, 24, 40, 0.10);">
                  <div style="height: 8px; line-height: 8px; background: linear-gradient(90deg, #D4AF37 0%, #F5DF8A 52%, #0A1F44 100%);">&nbsp;</div>
                  <div class="nj-card-heading" style="padding: 40px 44px 18px;">
                    ${eyebrow('NJ Store')}
                    <h1 class="nj-title" style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 34px; line-height: 1.12; color: #101828; letter-spacing: 0;">
                      ${escapeHtml(title)}
                    </h1>
                  </div>
                  <div class="nj-card-body" style="padding: 8px 44px 42px;">
                    ${body}
                  </div>
                  <div class="nj-card-footer" style="padding: 22px 44px; background: #F8FAFC; border-top: 1px solid #EAECF0;">
                    ${mutedParagraph('Need help? Reply to this email or contact NJ Store support.')}
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px 24px 0; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #98A2B3;">
                  This automated message was sent by NJ Store. Please ignore it if you did not request this action.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const renderTextParagraphs = (value: string): string =>
  value
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((value) => paragraph(escapeHtml(value).replace(/\n/g, '<br />')))
    .join('');

export const renderVerificationEmail = (name: string, verificationUrl: string): string =>
  renderBaseTemplate(
    'Verify your NJ Store account',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph('Thanks for joining NJ Store. Verify your email address to unlock quotation tracking, order history, and receipt uploads.')}
      ${actionRow(renderButton(verificationUrl, 'Verify Email'))}
      ${notice('Link expiry', 'This verification link expires in 24 hours.')}
    `
  );

export const renderPasswordResetEmail = (name: string, resetUrl: string): string =>
  renderBaseTemplate(
    'Reset your password',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph('We received a request to reset your NJ Store password. Use the button below to create a new password for your account.')}
      ${actionRow(renderButton(resetUrl, 'Reset Password'))}
      ${notice('Security note', 'This link expires in 1 hour and can only be used once. If you did not request a password reset, you can safely ignore this email.')}
    `
  );

export const renderQuotationEmail = (
  name: string,
  quotationUrl: string,
  pdfUrl: string,
  expiryDate: string
): string =>
  renderBaseTemplate(
    'Your quotation is ready',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph(`Your quotation has been prepared and is valid until <strong style="color: #101828;">${escapeHtml(expiryDate)}</strong>.`)}
      ${paragraph("Open the quotation to choose delivery or store pickup, then confirm it into an order when you're ready.")}
      ${actionRow(`${renderButton(quotationUrl, 'Review Quotation')}${renderButton(pdfUrl, 'Download PDF', 'secondary')}`)}
      ${notice('Next step', 'Review the quotation details before confirming your order.')}
    `
  );

export const renderOrderConfirmationEmail = (name: string, orderNumber: string): string =>
  renderBaseTemplate(
    'Order confirmed',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph(`Your quotation has been confirmed as order <strong style="color: #101828;">${escapeHtml(orderNumber)}</strong>.`)}
      ${notice('Payment receipt', 'You can upload your bank transfer receipt from your dashboard now. Your invoice will appear after an admin reviews the receipt and marks the order as paid.')}
    `
  );

export const renderReceiptRejectedEmail = (
  name: string,
  orderNumber: string,
  reason: string
): string =>
  renderBaseTemplate(
    'Receipt needs attention',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph(`Your payment receipt for order <strong style="color: #101828;">${escapeHtml(orderNumber)}</strong> was reviewed and needs to be uploaded again.`)}
      ${notice('Reason', escapeHtml(reason))}
    `
  );

export const renderOrderShippedEmail = (
  name: string,
  orderNumber: string,
  trackingNumber: string,
  orderUrl: string
): string =>
  renderBaseTemplate(
    'Your order is on the way',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph(`Your order <strong style="color: #101828;">${escapeHtml(orderNumber)}</strong> has been shipped.`)}
      ${detailTable(detailRow('Tracking number', trackingNumber))}
      ${actionRow(renderButton(orderUrl, 'View Order'))}
      ${notice('Delivery details', 'You can return to your account dashboard any time to review the order timeline and delivery details.')}
    `
  );

export const renderLowStockEmail = (productName: string, sku: string, stock: number): string =>
  renderBaseTemplate(
    'Low stock alert',
    `
      ${paragraph(`The product <strong style="color: #101828;">${escapeHtml(productName)}</strong> has reached low stock.`)}
      ${detailTable(`${detailRow('SKU', sku)}${detailRow('Available stock', String(stock))}`)}
      ${notice('Inventory reminder', 'Restock soon to avoid missed orders and quotation delays.')}
    `
  );

export const renderBackInStockEmail = (
  name: string,
  productName: string,
  productUrl: string,
  variantLabel?: string
): string =>
  renderBaseTemplate(
    'Back in stock',
    `
      ${paragraph(`Hello ${escapeHtml(name)},`)}
      ${paragraph(`<strong style="color: #101828;">${escapeHtml(productName)}</strong>${variantLabel ? ` (${escapeHtml(variantLabel)})` : ''} is back in stock.`)}
      ${actionRow(renderButton(productUrl, 'View Product'))}
      ${notice('Stock update', 'Stock can move quickly, so it is worth checking out soon.')}
    `
  );

export const renderProductQuestionReceivedEmail = (payload: {
  productName: string;
  customerName: string;
  customerEmail: string;
  question: string;
  adminUrl: string;
}): string =>
  renderBaseTemplate(
    'New product question',
    `
      ${paragraph(`A shopper asked a question about <strong style="color: #101828;">${escapeHtml(payload.productName)}</strong>.`)}
      ${detailTable(`${detailRow('Customer', payload.customerName)}${detailRow('Email', payload.customerEmail)}`)}
      ${notice('Question', escapeHtml(payload.question))}
      ${actionRow(renderButton(payload.adminUrl, 'Open Product Questions'))}
    `
  );

export const renderProductQuestionAnsweredEmail = (payload: {
  customerName: string;
  productName: string;
  question: string;
  answer: string;
  productUrl: string;
}): string =>
  renderBaseTemplate(
    'Your product question was answered',
    `
      ${paragraph(`Hello ${escapeHtml(payload.customerName)},`)}
      ${paragraph(`We answered your question about <strong style="color: #101828;">${escapeHtml(payload.productName)}</strong>.`)}
      ${notice('Your question', escapeHtml(payload.question))}
      ${notice('Answer', escapeHtml(payload.answer))}
      ${actionRow(renderButton(payload.productUrl, 'View Product'))}
    `
  );

export const renderAbandonedCartRecoveryEmail = (payload: {
  name: string;
  stageHours: number;
  cartUrl: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}): string =>
  renderBaseTemplate(
    'Your cart is waiting',
    `
      ${paragraph(`Hello ${escapeHtml(payload.name)},`)}
      ${paragraph(`You still have items waiting in your NJ Store cart after <strong style="color: #101828;">${escapeHtml(String(payload.stageHours))} hours</strong>.`)}
      <div style="margin: 24px 0 28px; padding: 18px 20px; border-radius: 18px; background: #F8FAFC; border: 1px solid #EAECF0;">
        ${payload.items
          .map(
            (item) => `
              <div style="padding: 12px 0; border-bottom: 1px solid #EAECF0;">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: #101828;">${escapeHtml(item.name)}</p>
                <p style="margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 13px; color: #667085;">Qty ${escapeHtml(String(item.quantity))} &middot; LKR ${escapeHtml(item.price.toLocaleString())}</p>
              </div>
            `
          )
          .join('')}
      </div>
      ${actionRow(renderButton(payload.cartUrl, 'Return To Cart'))}
      ${notice('Saved cart', 'Your saved cart is ready whenever you want to continue.')}
    `
  );

export const renderNewsletterConfirmationEmail = (confirmationUrl: string): string =>
  renderBaseTemplate(
    'Confirm your NJ Store newsletter subscription',
    `
      ${paragraph('Thanks for signing up to hear about NJ Store launches, flash deals, and quotation-friendly offers.')}
      ${paragraph('Please confirm your subscription to complete the double opt-in process.')}
      ${actionRow(renderButton(confirmationUrl, 'Confirm Subscription'))}
      ${notice('Link expiry', 'This confirmation link expires in 24 hours.')}
    `
  );

export const renderNewsletterWelcomeEmail = (): string =>
  renderBaseTemplate(
    'You are subscribed',
    `
      ${paragraph('Your NJ Store newsletter subscription is now active.')}
      ${notice('What to expect', 'You will hear about new arrivals, limited-time flash deals, and quotation-friendly bundles before the wider audience.')}
    `
  );

export const renderAdminBroadcastEmail = (payload: {
  previewText?: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  audienceLabel?: string;
}): string =>
  renderBaseTemplate(
    payload.headline,
    `
      ${payload.audienceLabel ? eyebrow(payload.audienceLabel) : ''}
      ${payload.previewText ? paragraph(`<span style="font-size: 18px; color: #101828;">${escapeHtml(payload.previewText)}</span>`) : ''}
      <div>
        ${renderTextParagraphs(payload.body)}
      </div>
      ${
        payload.ctaLabel && payload.ctaUrl
          ? `
            ${actionRow(renderButton(payload.ctaUrl, payload.ctaLabel))}
          `
          : ''
      }
      ${notice('Why you received this', 'You are receiving this update because you are subscribed to NJ Store communications or have a verified NJ Store account.')}
    `
  );
