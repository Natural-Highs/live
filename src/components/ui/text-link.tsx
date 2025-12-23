import * as React from 'react'
import {cn} from '@/lib/utils'

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	children: React.ReactNode
}

const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
	({children, className, ...props}, ref) => (
		<a
			ref={ref}
			className={cn(
				'font-bold text-muted-foreground text-base italic leading-6 underline-offset-4 hover:text-primary hover:underline',
				className
			)}
			{...props}
		>
			{children}
		</a>
	)
)

TextLink.displayName = 'TextLink'

export {TextLink}
