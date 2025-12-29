import {cn} from '@/lib/utils'

interface SpinnerProps {
	className?: string
	size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
	sm: 'h-4 w-4 border-2',
	md: 'h-6 w-6 border-2',
	lg: 'h-10 w-10 border-3'
}

export function Spinner({className, size = 'lg'}: SpinnerProps) {
	return (
		<output
			className={cn(
				'animate-spin rounded-full border-primary border-t-transparent',
				sizeClasses[size],
				className
			)}
			data-testid='spinner'
			aria-label='Loading'
		/>
	)
}
