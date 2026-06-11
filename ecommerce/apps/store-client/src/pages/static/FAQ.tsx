import { StaticContentPage } from './StaticContentPage';

export const FAQ = (): JSX.Element => (
  <StaticContentPage
    title="Frequently Asked Questions"
    description="Common questions about quotations, payments, shipping, and warranty handling."
    sections={[
      { heading: 'Why do some orders start as quotations?', body: 'Quotation-first checkout gives you a PDF summary with confirmed pricing, stock availability, shipping fees, and payment details before you commit to the order.' },
      { heading: 'How do I pay?', body: 'NJ Store currently supports bank transfer. After confirming a quotation, upload your receipt from the dashboard so the team can verify payment and move the order into fulfilment.' },
      { heading: 'How long does delivery take?', body: 'Delivery estimates depend on the district, stock location, item size, and courier capacity. The checkout and quotation screens show the latest configured estimate before confirmation.' },
      { heading: 'Can I pick up my order?', body: 'Pickup may be available for eligible orders. Choose pickup during checkout when it appears, then wait for the team to confirm the collection slot before visiting.' },
      { heading: 'Can I cancel an order?', body: 'Pending orders can be cancelled within the configured cancellation window. If payment has already been verified or fulfilment has started, contact support so the team can review the available options.' },
      { heading: 'What happens if an item is out of stock?', body: 'If stock changes before confirmation, NJ Store may suggest a replacement, revise the quotation, or cancel the affected item before asking you to proceed.' },
      { heading: 'Do products include warranty?', body: 'Warranty coverage depends on the product, condition, supplier, and manufacturer terms. Product pages and quotations show available warranty notes where they apply.' }
    ]}
  />
);
