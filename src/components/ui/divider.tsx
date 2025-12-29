import * as React from 'react'
import {cn} from '@/lib/utils'
import {Separator} from './separator'

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
	label?: string
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
	({className, label = 'Or', ...props}, ref) => (
		<div
			className={cn('my-4 flex items-center', className)}
			ref={ref}
			data-testid='divider'
			{...props}
		>
			<Separator className='flex-1' />
			<span className='px-4 text-muted-foreground text-sm'>{label}</span>
			<Separator className='flex-1' />
		</div>
	)
)

Divider.displayName = 'Divider'

export {Divider}
