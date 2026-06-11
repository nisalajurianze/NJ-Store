import { StaticContentPage } from './StaticContentPage';

export const Privacy = (): JSX.Element => (
  <StaticContentPage
    title="Privacy Policy"
    description="How NJ Store collects, stores, and uses account, order, and quotation information."
    sections={[
      { heading: 'Data we collect', body: 'We collect profile details, contact information, delivery addresses, quotation history, order records, uploaded payment receipts, product questions, reviews, and support messages needed to operate the store.' },
      { heading: 'Why we use it', body: 'Information is used for account access, quotation preparation, order fulfilment, payment verification, delivery coordination, fraud prevention, analytics, warranty support, and customer service communications.' },
      { heading: 'Payment receipts', body: 'Uploaded receipts are used only to verify bank-transfer payments and resolve order support questions. Avoid uploading documents that contain unrelated personal or financial information.' },
      { heading: 'Service providers', body: 'NJ Store may share the minimum required order and contact details with hosting, email, analytics, payment-verification, and delivery providers that help complete customer requests.' },
      { heading: 'Security controls', body: 'The platform limits sensitive data exposure in API responses, uses authenticated admin access for operational tools, and applies server-side validation and rate limiting to common public forms.' },
      { heading: 'Retention', body: 'Operational records are retained for accounting, warranty handling, dispute resolution, fraud prevention, and legal compliance. Data that is no longer required may be deleted or anonymized.' },
      { heading: 'Your choices', body: 'You can update account details from your dashboard where available. For access, correction, or deletion requests, contact support with the email address linked to your account.' }
    ]}
  />
);
