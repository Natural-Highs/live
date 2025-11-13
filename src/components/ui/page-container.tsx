import * as React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`min-h-screen flex flex-col items-center justify-center py-8 px-4 bg-bgGreen ${
          className || ''
        }`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';

export { PageContainer };
