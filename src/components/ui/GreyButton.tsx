import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode;       
}

const GreyButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, children, ...props }, ref) => {
		const baseClasses = "bg-btnGrey text-white w-[70%] text-[20px] font-kotta flex justify-center rounded-xl hover:bg-gray-700 active:shadow-sm";

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

GreyButton.displayName = 'GreyButton';

export default GreyButton;
