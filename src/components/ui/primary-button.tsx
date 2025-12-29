import type {VariantProps} from 'class-variance-authority'
import * as React from 'react'
import {cn} from '@/lib/utils'
import {Button, type buttonVariants} from './button'

export interface PrimaryButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		Omit<VariantProps<typeof buttonVariants>, 'variant'> {
	fullWidth?: boolean
	asChild?: boolean
}

const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
	({children, className, fullWidth = true, size, ...props}, ref) => (
		<Button
			ref={ref}
			variant='default'
			size={fullWidth ? 'full' : size}
			className={cn(className)}
			data-testid='button-primary'
			{...props}
		>
			{children}
		</Button>
	)
)
PrimaryButton.displayName = 'PrimaryButton'

export {PrimaryButton}
