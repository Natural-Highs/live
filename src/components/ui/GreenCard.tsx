import * as React from 'react'
import {cn} from '@/lib/utils'
import {Card, CardContent} from './card'

interface GreenCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
	showDivider?: boolean
}

const GreenCard = React.forwardRef<HTMLDivElement, GreenCardProps>(
	({className, children, showDivider = true, ...props}, ref) => {
		return (
			<Card
				ref={ref}
				className={cn('w-[25rem] border-none bg-accent p-1 shadow-xl', className)}
				data-testid='card-container'
				{...props}
			>
				{showDivider && <hr className='mx-auto mt-[-0.15rem] h-[2px] w-[42%] bg-black' />}
				<CardContent className='bg-accent p-4 shadow-none'>{children}</CardContent>
			</Card>
		)
	}
)

GreenCard.displayName = 'GreenCard'

export default GreenCard
