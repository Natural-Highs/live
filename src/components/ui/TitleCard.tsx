import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const TitleCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, ...props }, ref) => {
    const baseClasses = 'card bg-midGreen shadow-xl pb-1 px-[2rem] rounded-lg mb-[-0.75rem] h-auto';
    //flex justify-center

    return (
      <div ref={ref} className={`${baseClasses} ${className ?? ''}`} {...props}>
        {children}
      </div>
    );
  }
);

TitleCard.displayName = 'TitleCard';

export default TitleCard;
