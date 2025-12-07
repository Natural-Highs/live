import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  showDivider?: boolean;
}

const GreenCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, showDivider = true, ...props }, ref) => {
    const baseClasses =
      'card bg-midGreen flex flex-col w-[25rem] shadow-xl p-1 rounded-xl mb-[0.75rem]';
    const baseClassesInner = 'bg-midGreen w-full flex flex-col p-4 shadow-none rounded-lg';

    return (
      <div ref={ref} className={baseClasses}>
        {showDivider && <hr className="bg-black mx-auto w-[42%] h-[2px] mt-[-0.15rem]"></hr>}
        <div className={`${baseClassesInner} ${className ?? ''}`} {...props}>
          {children}
        </div>
      </div>
    );
  }
);

GreenCard.displayName = 'GreenCard';

export default GreenCard;
