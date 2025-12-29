import {queryOptions} from '@tanstack/react-query'

export type FormTemplateType = 'consent' | 'demographics' | 'survey'

export interface FormTemplate {
	id: string
	type: FormTemplateType
	name: string
	description?: string
	[key: string]: unknown
}

interface ApiResponse {
	success: boolean
	templates?: FormTemplate[]
	error?: string
}

export const formTemplatesQueryOptions = () =>
	queryOptions({
		queryKey: ['formTemplates'] as const,
		queryFn: async () => {
			const response = await fetch('/api/formTemplates')
			if (!response.ok) throw new Error('Failed to fetch form templates')
			const data = (await response.json()) as ApiResponse
			if (!(data.success && data.templates)) {
				throw new Error(data.error || 'Failed to load form templates')
			}
			return data.templates
		}
	})
