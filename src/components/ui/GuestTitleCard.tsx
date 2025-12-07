import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GuestTitleCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, ...props }, ref) => {
    /* const baseClasses = 'card bg-midGreen shadow-xl pb-1 px-[2rem] rounded-lg mb-[-0.75rem] h-auto'; */
    const baseClasses = 'card bg-midGreen rounded-lg shadow-xl pl-[1.2rem] mb-[-1.2rem] w-[66%] pb-1';
    //flex justify-center

    return (
      <div ref={ref} className={`${baseClasses} ${className ?? ''}`} {...props}>
        {children}
      </div>
    );
  }
);

GuestTitleCard.displayName = 'GuestTitleCard';

export default GuestTitleCard;
