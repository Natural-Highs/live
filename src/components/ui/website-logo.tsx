import * as React from 'react';

const DEFAULT_LOGO_SRC = '/logo.png';
// ============================================

export interface WebsiteLogoProps extends React.HTMLAttributes<HTMLImageElement> {
  /**
   * Size variant for the logo
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  
  /**
   * Alt text for the logo image
   * @default 'Website logo'
   */
  alt?: string;
}

const WebsiteLogo = React.forwardRef<HTMLImageElement, WebsiteLogoProps>(
  (
    {
      className,
      size = 'md',
      alt = 'Website logo',
      ...props
    },
    ref
  ) => {
    // Size configurations for logo
    const logoSizeClasses = {
      xs: 'w-8 h-8',
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-24 h-24',
      xl: 'w-32 h-32',
      '2xl': 'w-40 h-40',
    };

    return (
      <img
        ref={ref}
        src={DEFAULT_LOGO_SRC}
        alt={alt}
        className={`object-contain ${logoSizeClasses[size]} ${className || ''}`}
        {...props}
      />
    );
  }
);

WebsiteLogo.displayName = 'WebsiteLogo';

export { WebsiteLogo };
