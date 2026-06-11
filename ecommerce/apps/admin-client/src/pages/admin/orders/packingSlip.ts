import type { AdminOrderDto } from '@njstore/types';

type OrderRecord = AdminOrderDto;

const escapeHtml = (value: string | undefined): string =>
  (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDateTime = (value: string | undefined): string => {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

const formatFulfilmentType = (value?: string): string => (value ? value.replaceAll('_', ' ') : 'Not set');

export const buildPackingSlipHtml = (order: OrderRecord): string => {
  const destination = order.shippingAddress
    ? [
        order.shippingAddress.fullName,
        order.shippingAddress.label,
        order.shippingAddress.line1,
        order.shippingAddress.line2,
        [order.shippingAddress.city, order.shippingAddress.district].filter(Boolean).join(', '),
        order.shippingAddress.postalCode,
        order.shippingAddress.country,
        order.shippingAddress.phone
      ]
        .filter(Boolean)
        .map((line) => `<div>${escapeHtml(line)}</div>`)
        .join('')
    : `<div>${escapeHtml(order.pickupSlot ? `Pickup slot: ${order.pickupSlot}` : 'Store pickup')}</div>`;

  const items = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(item.variantLabel)}</td>
          <td style="text-align:right;">${item.quantity}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(order.orderNumber)} Packing Slip</title>
        <style>
          :root {
            color-scheme: light;
            font-family: "Inter", "Segoe UI", sans-serif;
          }
          body {
            margin: 0;
            padding: 32px;
            color: #101828;
            background: #ffffff;
          }
          .header,
          .meta,
          .notes {
            border: 1px solid #d0d5dd;
            border-radius: 16px;
            padding: 18px 20px;
            margin-bottom: 18px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }
          .eyebrow {
            margin: 0 0 8px;
            font-size: 11px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #667085;
          }
          h1 {
            margin: 0;
            font-size: 28px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d0d5dd;
            border-radius: 16px;
            overflow: hidden;
          }
          th,
          td {
            padding: 12px 14px;
            border-bottom: 1px solid #eaecf0;
            text-align: left;
            font-size: 14px;
          }
          th {
            background: #f8fafc;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #475467;
          }
          tr:last-child td {
            border-bottom: 0;
          }
          .note-block {
            margin-top: 10px;
            color: #344054;
            line-height: 1.5;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <section class="header">
          <p class="eyebrow">Packing Slip</p>
          <h1>${escapeHtml(order.orderNumber)}</h1>
          <div class="note-block">Placed ${escapeHtml(formatDateTime(order.createdAt))}</div>
        </section>
        <section class="grid">
          <div class="meta">
            <p class="eyebrow">Fulfilment</p>
            <div>${escapeHtml(formatFulfilmentType(order.type))}</div>
            <div class="note-block">${escapeHtml(order.trackingNumber ? `Tracking: ${order.trackingNumber}` : 'Tracking pending')}</div>
          </div>
          <div class="meta">
            <p class="eyebrow">Destination</p>
            ${destination}
          </div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Variant</th>
              <th style="text-align:right;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>
        ${
          order.notes?.trim() || order.deliveryNotes?.trim()
            ? `
              <section class="notes">
                <p class="eyebrow">Notes</p>
                ${order.notes?.trim() ? `<div class="note-block"><strong>Order:</strong> ${escapeHtml(order.notes)}</div>` : ''}
                ${
                  order.deliveryNotes?.trim()
                    ? `<div class="note-block"><strong>Delivery:</strong> ${escapeHtml(order.deliveryNotes)}</div>`
                    : ''
                }
              </section>
            `
            : ''
        }
      </body>
    </html>
  `;
};
