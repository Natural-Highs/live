import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GreenCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, ...props }, ref) => {
    const baseClasses = 'card-body bg-midGreen w-full max-w-md shadow-xl padding-4 rounded-xl';

    return (
      <div ref={ref} className={`${baseClasses} ${className ?? ''}`} {...props}>
        {children}
      </div>
    );
  }
);

GreenCard.displayName = 'GreenCard';

export default GreenCard;
