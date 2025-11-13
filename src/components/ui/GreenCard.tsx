import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GreenCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, ...props }, ref) => {
    const baseClasses = 'card bg-midGreen shadow-xl p-1 rounded-xl mb-[0.75rem]';
    const baseClassesInner = 'bg-midGreen w-full max-w-md p-4 shadow-none rounded-lg';

    return (
      <div ref={ref} className={baseClasses}>
        <hr className="bg-black mx-auto w-[45%] h-[2px] mt-[-0.15rem]"></hr>
        <div className={`${baseClassesInner} ${className ?? ''}`} {...props}>
          {children}
        </div>
      </div>
    );
  }
);

GreenCard.displayName = 'GreenCard';

export default GreenCard;
