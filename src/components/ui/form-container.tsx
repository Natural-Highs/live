import type * as React from 'react'

export interface FormContainerProps
	extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

const FormContainer = ({
	className,
	children,
	ref,
	...props
}: FormContainerProps & {ref?: React.RefObject<HTMLDivElement | null>}) => (
	<div
		className={`relative space-y-4 rounded-lg bg-base-200 p-6 ${className || ''}`}
		ref={ref}
		{...props}
	>
		{children}
	</div>
)
FormContainer.displayName = 'FormContainer'

export {FormContainer}
