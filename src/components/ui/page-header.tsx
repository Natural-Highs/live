import type * as React from 'react'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string
	subtitle?: string
	showIndicators?: boolean
	children?: React.ReactNode
}

const PageHeader = ({
	className,
	title,
	subtitle,
	showIndicators,
	children,
	ref,
	...props
}: PageHeaderProps & {ref?: React.RefObject<HTMLDivElement | null>}) => (
	<div className={`mb-6 text-center ${className || ''}`} ref={ref} {...props}>
		{children}
		<h1 className='mb-2 font-bold text-4xl text-[#1e1e1e]'>{title}</h1>
		{subtitle && <div className='mb-4 text-gray-600 text-xs'>{subtitle}</div>}
		{showIndicators && <div className='mb-4 text-gray-600 text-xs'>Page indicators</div>}
	</div>
)
PageHeader.displayName = 'PageHeader'

export {PageHeader}
