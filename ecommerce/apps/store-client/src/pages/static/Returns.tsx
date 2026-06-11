import { StaticContentPage } from './StaticContentPage';

export const Returns = (): JSX.Element => (
  <StaticContentPage
    title="Return Policy"
    description="Guidelines for damaged, defective, or incorrect items received from NJ Store."
    sections={[
      { heading: 'Damaged items', body: 'Report transit damage with supporting photos as soon as possible after delivery so the team can investigate with the courier and advise on replacement, repair, or refund options.' },
      { heading: 'Incorrect items', body: 'If you receive the wrong product, variant, accessory, or configuration, contact support with your order number and photos of the received item and packaging.' },
      { heading: 'Defective products', body: 'For suspected manufacturing defects, keep the product, accessories, serial-number labels, invoice, and packaging available until support confirms the next inspection step.' },
      { heading: 'Return condition', body: 'Returned items should include all original accessories, manuals, warranty cards, gifts, and packaging unless support instructs otherwise. Missing items may affect the resolution.' },
      { heading: 'Non-returnable cases', body: 'Returns may be declined for physical damage caused after delivery, unauthorized repair attempts, missing serial numbers, consumable wear, or products excluded by supplier or manufacturer terms.' },
      { heading: 'Warranty support', body: 'Official stock includes manufacturer-backed warranty terms where applicable. NJ Store can coordinate the support path, but approval depends on the manufacturer or authorized service provider.' },
      { heading: 'Refund timing', body: 'Approved refunds are processed after the returned item is inspected and the resolution is confirmed. Bank processing times may vary depending on the customer bank.' }
    ]}
  />
);
