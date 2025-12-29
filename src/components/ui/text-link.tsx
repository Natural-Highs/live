import type * as React from 'react'

export interface TextLinkProps
	extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	children: React.ReactNode
	className?: string
}

const TextLink = ({
	children,
	className,
	ref,
	...props
}: TextLinkProps & {ref?: React.RefObject<HTMLAnchorElement | null>}) => (
	<a
		className={`link font-bold text-[#515050] text-[16px] italic leading-[24px] hover:text-primary ${
			className || ''
		}`}
		ref={ref}
		{...props}
	>
		{children}
	</a>
)
TextLink.displayName = 'TextLink'

export {TextLink}
