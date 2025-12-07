import * as React from 'react';

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, size = 'md', showEmoji = true, ...props }, ref) => {
    const sizeClasses = {
      sm: 'w-16 h-16 text-2xl',
      md: 'w-28 h-28 text-4xl',
      lg: 'w-36 h-36 text-5xl',
    };

    return (
      <div
        ref={ref}
        className={`bg-base-200 rounded-lg flex items-center justify-center ${
          sizeClasses[size]
        } ${className || ''}`}
        {...props}
      >
        {showEmoji && <span>🌿</span>}
      </div>
    );
  }
);
Logo.displayName = 'Logo';

export { Logo };
