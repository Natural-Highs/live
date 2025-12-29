import type * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode
}

const GreyButton = ({
	className,
	children,
	ref,
	...props
}: ButtonProps & {ref?: React.RefObject<HTMLButtonElement | null>}) => {
	const baseClasses =
		'bg-btnGrey text-white w-[75%] min-h-[2.7rem] text-[20px] font-kotta rounded-[1.13rem] flex justify-center mx-auto items-center hover:bg-gray-700 active:shadow-sm cursor-pointer disabled:cursor-not-allowed'

	return (
		<button
			className={`${baseClasses} ${className ?? ''}`}
			ref={ref}
			{...props}
		>
			{children}
		</button>
	)
}

GreyButton.displayName = 'GreyButton'

export default GreyButton
