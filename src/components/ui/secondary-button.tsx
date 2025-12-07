import * as React from 'react';

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ children, className, fullWidth = true, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`btn btn-secondary rounded-[20px] text-[20px] leading-[30px] font-normal ${
          fullWidth ? 'w-full max-w-[338px]' : ''
        } h-12 ${className || ''}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SecondaryButton.displayName = 'SecondaryButton';

export { SecondaryButton };
