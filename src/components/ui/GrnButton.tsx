import type * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode
}

const GrnButton = ({
	className,
	children,
	ref,
	...props
}: ButtonProps & {ref?: React.RefObject<HTMLButtonElement | null>}) => {
	const baseClasses =
		'bg-btnGreen text-white w-[75%] min-h-[2.7rem] text-[20px] rounded-[1.13rem] font-kotta flex justify-center mx-auto items-center hover:bg-green-900 active:shadow-sm cursor-pointer disabled:cursor-not-allowed'

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

GrnButton.displayName = 'GrnButton'

export default GrnButton
