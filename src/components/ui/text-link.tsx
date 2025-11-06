import * as React from 'react';

export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  className?: string;
}

const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={`link text-[16px] leading-[24px] font-bold italic text-[#515050] hover:text-primary ${
          className || ''
        }`}
        {...props}
      >
        {children}
      </a>
    );
  }
);
TextLink.displayName = 'TextLink';

export { TextLink };
