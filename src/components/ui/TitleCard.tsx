import * as React from 'react'
import {cn} from '@/lib/utils'
import {Card} from './card'

interface TitleCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

const TitleCard = React.forwardRef<HTMLDivElement, TitleCardProps>(
	({className, children, ...props}, ref) => {
		return (
			<Card
				ref={ref}
				className={cn(
					'mb-[-0.75rem] h-auto rounded-lg border-none bg-accent px-[2rem] pb-1 shadow-xl',
					className
				)}
				data-testid='card-title'
				{...props}
			>
				{children}
			</Card>
		)
	}
)

TitleCard.displayName = 'TitleCard'

export default TitleCard
