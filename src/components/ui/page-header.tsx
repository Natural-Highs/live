import * as React from 'react';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  showIndicators?: boolean;
  children?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, subtitle, showIndicators, children, ...props }, ref) => {
    return (
      <div ref={ref} className={`text-center mb-6 ${className || ''}`} {...props}>
        {children}
        <h1 className="text-4xl font-bold text-[#1e1e1e] mb-2">{title}</h1>
        {subtitle && <div className="text-xs text-gray-600 mb-4">{subtitle}</div>}
        {showIndicators && <div className="text-xs text-gray-600 mb-4">Page indicators</div>}
      </div>
    );
  }
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };
