import * as React from 'react';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, label = 'Or', ...props }, ref) => {
    return (
      <div ref={ref} className={`flex items-center my-4 ${className || ''}`} {...props}>
        <div className="flex-1 border-t border-gray-400" />
        <span className="px-4 text-gray-600 text-sm">{label}</span>
        <div className="flex-1 border-t border-gray-400" />
      </div>
    );
  }
);
Divider.displayName = 'Divider';

export { Divider };
