import type * as React from 'react'

export interface PageContainerProps
	extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

const PageContainer = ({
	className,
	children,
	ref,
	...props
}: PageContainerProps & {ref?: React.RefObject<HTMLDivElement | null>}) => (
	<div
		className={`flex min-h-screen flex-col items-center justify-center bg-bgGreen px-4 py-8 ${
			className || ''
		}`}
		ref={ref}
		{...props}
	>
		{children}
	</div>
)

PageContainer.displayName = 'PageContainer'

export {PageContainer}
