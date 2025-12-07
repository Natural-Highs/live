import { MDXProvider } from '@mdx-js/react';
import type React from 'react';
import { FeatureCard, FlowDiagram, Slideshow, StatusBadge } from '../../docs/preview/components';
import ShowcaseContent from '../../docs/preview/index.mdx';

const components = {
  FeatureCard,
  StatusBadge,
  FlowDiagram,
  Slideshow,
};

const ShowcasePage: React.FC = () => {
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <MDXProvider components={components}>
        <ShowcaseContent />
      </MDXProvider>
    </div>
  );
};

export default ShowcasePage;
