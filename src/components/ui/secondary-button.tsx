import type * as React from 'react'

export interface SecondaryButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children: React.ReactNode
	className?: string
	fullWidth?: boolean
}

const SecondaryButton = ({
	children,
	className,
	fullWidth = true,
	ref,
	...props
}: SecondaryButtonProps & {
	ref?: React.RefObject<HTMLButtonElement | null>
}) => (
	<button
		className={`btn btn-secondary rounded-[20px] font-normal text-[20px] leading-[30px] ${
			fullWidth ? 'w-full max-w-[338px]' : ''
		} h-12 ${className || ''}`}
		ref={ref}
		type='button'
		{...props}
	>
		{children}
	</button>
)
SecondaryButton.displayName = 'SecondaryButton'

export {SecondaryButton}
