import { StaticContentPage } from './StaticContentPage';

export const Terms = (): JSX.Element => (
  <StaticContentPage
    title="Terms & Conditions"
    description="Commercial terms that apply to NJ Store quotations, order confirmation, payment, and delivery."
    sections={[
      { heading: 'Quotations', body: 'Quotations remain valid until the listed expiry date and are subject to stock availability, supplier pricing, and delivery feasibility until the customer confirms the order.' },
      { heading: 'Order confirmation', body: 'An order is confirmed only after the customer accepts the quotation or checkout summary and NJ Store records the order in the customer dashboard.' },
      { heading: 'Payments', body: 'Confirmed orders proceed after bank-transfer receipt submission and administrative verification. NJ Store may request a clearer receipt or additional reference details before fulfilment.' },
      { heading: 'Pricing and availability', body: 'Prices, promotions, stock counts, and product specifications may change before confirmation. If a material change occurs, the team may revise the quotation or cancel the affected item.' },
      { heading: 'Delivery', body: 'Estimated delivery windows are provided at checkout and may vary by district, weather, courier capacity, public holidays, product size, or recipient availability.' },
      { heading: 'Customer responsibilities', body: 'Customers are responsible for providing accurate contact, billing, delivery, and pickup information. Delays caused by incomplete or incorrect details may extend fulfilment timelines.' },
      { heading: 'Account use', body: 'Customers must keep account credentials secure and use the store only for lawful purchases, support requests, product reviews, and quotation communication.' },
      { heading: 'Support and disputes', body: 'For order questions, returns, payment verification, or warranty support, contact NJ Store with the order number and relevant evidence so the team can review the request.' }
    ]}
  />
);
