import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;       
}

const GrnButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, children, ...props }, ref) => {
		const baseClasses = "btn bg-btnGreen text-white w-[70%] font-size:20px justify-content:center rounded-xl hover:bg-green-900 active:shadow-sm";

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