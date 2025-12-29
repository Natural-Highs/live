import {cva, type VariantProps} from 'class-variance-authority'
import type * as React from 'react'

import {cn} from '@/lib/utils'

const alertVariants = cva(
	'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
	{
		variants: {
			variant: {
				default: 'bg-background text-foreground',
				error:
					'border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive',
				warning:
					'border-yellow-500/50 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 [&>svg]:text-yellow-600',
				info: 'border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600',
				success:
					'border-green-500/50 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200 [&>svg]:text-green-600'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
)

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
	return (
		<div
			data-slot='alert'
			data-testid='alert'
			role='alert'
			className={cn(alertVariants({variant}), className)}
			{...props}
		/>
	)
}

function AlertTitle({className, ...props}: React.ComponentProps<'h5'>) {
	return (
		<h5
			data-slot='alert-title'
			className={cn('mb-1 font-medium leading-none tracking-tight', className)}
			{...props}
		/>
	)
}

function AlertDescription({className, ...props}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='alert-description'
			className={cn('text-sm [&_p]:leading-relaxed', className)}
			{...props}
		/>
	)
}

export {Alert, AlertDescription, AlertTitle, alertVariants}
