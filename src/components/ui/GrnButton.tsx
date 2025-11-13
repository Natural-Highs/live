import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;       
}

const GrnButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, children, ...props }, ref) => {
		const baseClasses = "bg-btnGreen text-white w-full text-[20px] font-kotta flex justify-center rounded-xl hover:bg-green-900 active:shadow-sm";

		return (
			<button 
			ref={ref}
			className={`${baseClasses} ${className ?? ""}`}
			{...props}
			>
				{children}
			</button>
		);
	}
);

GrnButton.displayName = 'GrnButton';

export default GrnButton;