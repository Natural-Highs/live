import type * as React from 'react'

// ============================================
// DEFAULT LOGO CONFIGURATION
// ============================================
// To use your own logo, set DEFAULT_LOGO_SRC to your logo path:
// - For public folder: '/logo.png' (or .svg, .jpg, etc.)
// - For src/assets: import it and use the imported path
// - Leave as undefined to use the emoji fallback (🌿)
const DEFAULT_LOGO_SRC = '/logo.png'
// ============================================

export interface BrandLogoProps extends React.HTMLAttributes<HTMLDivElement> {
	/**
	 * Size variant for the logo and title
	 * @default 'md'
	 */
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

	/**
	 * Layout direction
	 * @default 'horizontal'
	 */
	direction?: 'horizontal' | 'vertical'

	/**
	 * Custom logo image source (optional, defaults to emoji)
	 */
	logoSrc?: string

	/**
	 * Website name/title
	 * @default 'Natural Highs'
	 */
	title?: string

	/**
	 * Show the logo
	 * @default true
	 */
	showLogo?: boolean

	/**
	 * Show the title
	 * @default false
	 */
	showTitle?: boolean

	/**
	 * Custom className for the title element (useful for font customization)
	 */
	titleClassName?: string

	/**
	 * Position of the title when shown with the logo
	 * @default 'below'
	 */
	titlePosition?: 'above' | 'below'

	/**
	 * Override tailwind gap class between logo and title
	 */
	gapClassName?: string

	/**
	 * Override gap size with inline style (number treated as px)
	 */
	gap?: number | string

	/**
	 * Fine-tune spacing between title and logo (number treated as px, can be negative)
	 */
	titleSpacing?: number | string
}

const BrandLogo = ({
	className,
	size = 'md',
	direction = 'horizontal',
	logoSrc,
	title = 'Natural Highs',
	showLogo = true,
	showTitle = false,
	titleClassName,
	titlePosition = 'below',
	gapClassName,
	gap,
	titleSpacing,
	style,
	ref,
	...props
}: BrandLogoProps & {ref?: React.RefObject<HTMLDivElement | null>}) => {
	// Size configurations for logo
	const logoSizeClasses = {
		xs: 'w-8 h-8 text-lg',
		sm: 'w-12 h-12 text-xl',
		md: 'w-16 h-16 text-2xl',
		lg: 'w-24 h-24 text-4xl',
		xl: 'w-32 h-32 text-5xl',
		'2xl': 'w-40 h-40 text-6xl'
	}

	// Size configurations for title text
	const titleSizeClasses = {
		xs: 'text-sm',
		sm: 'text-base',
		md: 'text-lg',
		lg: 'text-2xl',
		xl: 'text-3xl',
		'2xl': 'text-4xl'
	}

	// Gap between logo and title
	const gapClasses = {
		xs: direction === 'horizontal' ? 'gap-1' : 'gap-0.5',
		sm: direction === 'horizontal' ? 'gap-2' : 'gap-1',
		md: direction === 'horizontal' ? 'gap-3' : 'gap-2',
		lg: direction === 'horizontal' ? 'gap-4' : 'gap-3',
		xl: direction === 'horizontal' ? 'gap-5' : 'gap-4',
		'2xl': direction === 'horizontal' ? 'gap-6' : 'gap-5'
	}

	const flexDirection = direction === 'horizontal' ? 'flex-row' : 'flex-col'
	const alignItems = direction === 'horizontal' ? 'items-center' : 'items-center'
	const gapClass = gapClassName || gapClasses[size]
	const resolvedGap = gap !== undefined ? (typeof gap === 'number' ? `${gap}px` : gap) : undefined
	const resolvedTitleSpacing =
		titleSpacing !== undefined
			? typeof titleSpacing === 'number'
				? `${titleSpacing}px`
				: titleSpacing
			: resolvedGap
	const gapStyle =
		resolvedGap !== undefined
			? direction === 'horizontal'
				? {
						gap: resolvedGap,
						columnGap: resolvedGap
					}
				: {
						gap: resolvedGap,
						rowGap: resolvedGap
					}
			: undefined
	const combinedStyle = style
		? {
				...style,
				...(gapStyle ?? {})
			}
		: gapStyle

	const Title = () =>
		showTitle ? (
			<h1
				className={`m-0 font-bold text-foreground ${titleSizeClasses[size]} ${
					direction === 'horizontal' ? '' : 'text-center'
				} ${titleClassName || ''}`}
				style={
					direction === 'vertical' && resolvedTitleSpacing
						? titlePosition === 'above'
							? {marginBottom: resolvedTitleSpacing}
							: {marginTop: resolvedTitleSpacing}
						: undefined
				}
			>
				{title}
			</h1>
		) : null

	const LogoEl = () =>
		showLogo ? (
			<div className={`flex flex-shrink-0 items-center justify-center ${logoSizeClasses[size]}`}>
				{logoSrc || DEFAULT_LOGO_SRC ? (
					<img
						alt={`${title} logo`}
						className='h-full w-full rounded-lg object-contain'
						src={logoSrc || DEFAULT_LOGO_SRC}
					/>
				) : (
					<span>🌿</span>
				)}
			</div>
		) : null

	return (
		<div
			className={`flex ${flexDirection} ${alignItems} ${gapClass} ${className || ''}`}
			ref={ref}
			style={combinedStyle}
			{...props}
		>
			{direction === 'vertical' && titlePosition === 'above' ? (
				<>
					<Title />
					<LogoEl />
				</>
			) : (
				<>
					<LogoEl />
					<Title />
				</>
			)}
		</div>
	)
}

BrandLogo.displayName = 'BrandLogo'

export {BrandLogo}
