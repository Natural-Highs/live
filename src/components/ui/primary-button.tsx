import * as React from 'react';

export interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ children, className, fullWidth = true, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`btn btn-primary rounded-[20px] text-[20px] leading-[30px] font-normal ${
          fullWidth ? 'w-full max-w-[338px]' : ''
        } h-12 ${className || ''}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PrimaryButton.displayName = 'PrimaryButton';

export { PrimaryButton };

