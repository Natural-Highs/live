import * as React from 'react'
import {cn} from '@/lib/utils'
import {Card} from './card'

interface GuestTitleCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

const GuestTitleCard = React.forwardRef<HTMLDivElement, GuestTitleCardProps>(
	({className, children, ...props}, ref) => {
		return (
			<Card
				ref={ref}
				className={cn(
					'mb-[-1.2rem] w-[66%] rounded-lg border-none bg-accent pb-1 pl-[1.2rem] shadow-xl',
					className
				)}
				data-testid='card-guest'
				{...props}
			>
				{children}
			</Card>
		)
	}
)

GuestTitleCard.displayName = 'GuestTitleCard'

export default GuestTitleCard
