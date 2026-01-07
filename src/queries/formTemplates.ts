import {queryOptions} from '@tanstack/react-query'
import {getFormTemplates} from '@/server/functions/admin'

export type FormTemplateType = 'consent' | 'demographics' | 'survey'

export interface FormTemplate {
	id: string
	type: FormTemplateType
	name: string
	description?: string
}

export const formTemplatesQueryOptions = () =>
	queryOptions({
		queryKey: ['formTemplates'] as const,
		queryFn: () => getFormTemplates()
	})
