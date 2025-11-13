import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const TitleCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, children, ...props }, ref) => {
    const baseClasses = 'card-body bg-midGreen shadow-xl padding-[0.8rem] rounded-xl mb-[-0.75rem]';
    //flex justify-center

    return (
      <div ref={ref} className={`${baseClasses} ${className ?? ''}`} {...props}>
        {children}
        <hr className="bg-black mx-auto w-[90%] height-[0.5rem]"></hr>
      </div>
    );
  }
);

TitleCard.displayName = 'TitleCard';

export default TitleCard;
