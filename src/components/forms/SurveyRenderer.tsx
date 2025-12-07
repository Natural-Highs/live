import {useCallback, useEffect, useMemo} from 'react'
import 'survey-core/survey-core.css'
import {Model} from 'survey-core'
import {Survey} from 'survey-react-ui'

export interface SurveyJSJson {
	title?: string
	description?: string
	pages: Array<{
		name?: string
		elements: any[]
	}>
	completedHtml?: string
	showProgressBar?: boolean | string
}

interface SurveyRendererProps {
	surveyJson: SurveyJSJson
	onSubmit: (data: Record<string, unknown>) => Promise<void>
	onError?: (error: Error) => void
	showProgressBar?: boolean
}

/**
 * SurveyJS form renderer component
 *
 * Renders a SurveyJS form from JSON configuration and handles form submission.
 * Applies custom CSS styling to match DaisyUI theme. Supports progress bar display
 * and error handling.
 *
 * @param props - Component props
 * @param props.surveyJson - SurveyJS JSON configuration object
 * @param props.onSubmit - Async callback function called when form is submitted with form data
 * @param props.onError - Optional error handler callback
 * @param props.showProgressBar - Whether to show progress bar (default: true)
 *
 * @example
 * ```typescript
 * <SurveyRenderer
 *   surveyJson={consentFormJson}
 *   onSubmit={async (data) => {
 *     await submitConsentForm(data);
 *   }}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export function SurveyRenderer({
	surveyJson,
	onSubmit,
	onError,
	showProgressBar = true
}: SurveyRendererProps) {
	// Apply custom CSS to match DaisyUI theme
	useEffect(() => {
		const style = document.createElement('style')
		style.textContent = `
			.sd-root-modern {
				--sjs-primary-color: #347937;
				--sjs-primary-backcolor: #347937;
				--sjs-primary-forecolor: #ffffff;
				--sjs-secondary-color: #637b7c;
				--sjs-border-default: #d4d4d4;
				--sjs-border-light: #e2fde6;
				--sjs-font-family: inherit;
				--sjs-font-size: 1rem;
				--sjs-general-backcolor: #ffffff;
				--sjs-general-backcolor-dark: #e2fde6;
				--sjs-question-background: #ffffff;
				--sjs-questionpanel-backcolor: #ffffff;
			}
			.sd-root-modern .sd-question__title {
				font-size: 1.125rem;
				font-weight: 600;
				color: #1e1e1e;
			}
			.sd-root-modern .sd-question__required-text {
				color: #ef4444;
			}
			.sd-root-modern .sd-btn {
				background-color: #347937;
				border-color: #347937;
				color: #ffffff;
				border-radius: 0.5rem;
			}
			.sd-root-modern .sd-btn:hover {
				background-color: #2d6530;
				border-color: #2d6530;
			}
			.sd-root-modern .sd-input {
				border-color: #d4d4d4;
				border-radius: 0.5rem;
			}
		`
		document.head.appendChild(style)
		return () => {
			document.head.removeChild(style)
		}
	}, [])

	const survey = useMemo(() => {
		const model = new Model({
			...surveyJson,
			showProgressBar: showProgressBar ? 'bottom' : 'off'
		})

		return model
	}, [surveyJson, showProgressBar])

	const handleComplete = useCallback(
		async (sender: Model) => {
			try {
				await onSubmit(sender.data)
			} catch (error) {
				onError?.(
					error instanceof Error ? error : new Error('Submission failed')
				)
			}
		},
		[onSubmit, onError]
	)

	survey.onComplete.add(handleComplete)

	return <Survey model={survey} />
}
