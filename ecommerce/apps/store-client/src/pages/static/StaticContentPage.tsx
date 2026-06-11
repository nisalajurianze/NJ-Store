import { Card, SectionHeading } from '@njstore/ui';

interface StaticContentPageProps {
  title: string;
  description: string;
  sections: Array<{ heading: string; body: string }>;
}

export const StaticContentPage = ({ title, description, sections }: StaticContentPageProps): JSX.Element => (
  <div className="page-shell page-nav-gap pb-0">
    <Card className="rounded-3xl p-8">
      <SectionHeading title={title} description={description} />
      <div className="mt-8 space-y-6">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="font-display text-2xl text-white">{section.heading}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-300">{section.body}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);
