import type * as React from 'react'

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
	label?: string
}

const Divider = ({
	className,
	label = 'Or',
	ref,
	...props
}: DividerProps & {ref?: React.RefObject<HTMLDivElement | null>}) => (
	<div
		className={`my-4 flex items-center ${className || ''}`}
		ref={ref}
		{...props}
	>
		<div className='flex-1 border-gray-400 border-t' />
		<span className='px-4 text-gray-600 text-sm'>{label}</span>
		<div className='flex-1 border-gray-400 border-t' />
	</div>
)
Divider.displayName = 'Divider'

export {Divider}
