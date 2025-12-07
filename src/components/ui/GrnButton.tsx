import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const GrnButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    const baseClasses =
      'bg-btnGreen text-white w-[75%] min-h-[2.7rem] text-[20px] rounded-[1.13rem] font-kotta flex justify-center mx-auto items-center hover:bg-green-900 active:shadow-sm cursor-pointer disabled:cursor-not-allowed';

    return (
      <button ref={ref} className={`${baseClasses} ${className ?? ''}`} {...props}>
        {children}
      </button>
    );
  }
);

GrnButton.displayName = 'GrnButton';

export default GrnButton;
