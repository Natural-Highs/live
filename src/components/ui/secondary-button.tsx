import type {VariantProps} from 'class-variance-authority'
import * as React from 'react'
import {cn} from '@/lib/utils'
import {Button, type buttonVariants} from './button'

export interface SecondaryButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		Omit<VariantProps<typeof buttonVariants>, 'variant'> {
	fullWidth?: boolean
	asChild?: boolean
}

const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
	({children, className, fullWidth = true, size, ...props}, ref) => (
		<Button
			ref={ref}
			variant='secondary'
			size={fullWidth ? 'full' : size}
			className={cn(className)}
			data-testid='button-secondary'
			{...props}
		>
			{children}
		</Button>
	)
)
SecondaryButton.displayName = 'SecondaryButton'

export {SecondaryButton}
