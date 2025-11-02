import * as React from 'react';

export interface FormContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const FormContainer = React.forwardRef<HTMLDivElement, FormContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-base-200 rounded-lg p-6 space-y-4 relative ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormContainer.displayName = 'FormContainer';

export { FormContainer };
