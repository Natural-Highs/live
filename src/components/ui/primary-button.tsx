import type * as React from 'react'

export interface PrimaryButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode
	className?: string
	fullWidth?: boolean
}

const PrimaryButton = ({
	children,
	className,
	fullWidth = true,
	ref,
	...props
}: PrimaryButtonProps & {ref?: React.RefObject<HTMLButtonElement | null>}) => (
	<button
		className={`btn btn-primary rounded-[20px] font-normal text-[20px] leading-[30px] ${
			fullWidth ? 'w-full max-w-[338px]' : ''
		} h-12 ${className || ''}`}
		ref={ref}
		type='button'
		{...props}
	>
		{children}
	</button>
)
PrimaryButton.displayName = 'PrimaryButton'

export {PrimaryButton}
