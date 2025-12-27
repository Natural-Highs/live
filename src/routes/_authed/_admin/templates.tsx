import {createFileRoute} from '@tanstack/react-router'
import {useCallback, useEffect, useState} from 'react'
import {SurveyCreatorComponent} from '@/components/forms/SurveyCreator'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Spinner} from '@/components/ui/spinner'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'

type FormTemplateType = 'consent' | 'demographics' | 'survey'

interface FormTemplate {
	id: string
	type: FormTemplateType
	name: string
	description?: string
	ageCategory?: 'under18' | 'adult' | 'senior'
	isActive?: boolean
	questions?: readonly unknown[]
	surveyJson?: unknown
	createdAt?: Date | string
	version?: number
	[key: string]: unknown
}

export const Route = createFileRoute('/_authed/_admin/templates')({
	component: TemplatesComponent
})

function TemplatesComponent() {
	const [templates, setTemplates] = useState<FormTemplate[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [filterType, setFilterType] = useState<FormTemplateType | 'all'>('all')
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [showEditModal, setShowEditModal] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
	const [formData, setFormData] = useState({
		type: 'consent' as FormTemplateType,
		name: '',
		description: '',
		ageCategory: '' as '' | 'under18' | 'adult' | 'senior'
	})
	const [editingSurveyJson, setEditingSurveyJson] = useState<unknown>(null)

	const fetchTemplates = useCallback(async () => {
		setLoading(true)
		setError('')
		try {
			const url =
				filterType === 'all' ? '/api/formTemplates' : `/api/formTemplates?type=${filterType}`
			const response = await fetch(url)
			const data = (await response.json()) as {
				success: boolean
				templates?: FormTemplate[]
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to load templates')
				return
			}

			if (data.templates) {
				setTemplates(data.templates)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load templates')
		} finally {
			setLoading(false)
		}
	}, [filterType])

	useEffect(() => {
		fetchTemplates()
	}, [fetchTemplates])

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		try {
			const response = await fetch('/api/formTemplates', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					type: formData.type,
					name: formData.name,
					questions: []
				})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to create template')
				return
			}

			setShowCreateModal(false)
			setFormData({
				type: 'consent',
				name: '',
				description: '',
				ageCategory: ''
			})
			await fetchTemplates()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create template')
		}
	}

	const handleEdit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!selectedTemplate) {
			return
		}
		setError('')

		try {
			const updatePayload: {
				name: string
				questions?: unknown[]
				surveyJson?: unknown
			} = {
				name: formData.name
			}

			if (editingSurveyJson) {
				updatePayload.surveyJson = editingSurveyJson
			} else {
				updatePayload.questions = selectedTemplate.questions ? [...selectedTemplate.questions] : []
			}

			const response = await fetch(`/api/formTemplates/${selectedTemplate.id}`, {
				method: 'PATCH',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(updatePayload)
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to update template')
				return
			}

			setShowEditModal(false)
			setSelectedTemplate(null)
			setEditingSurveyJson(null)
			setFormData({
				type: 'consent',
				name: '',
				description: '',
				ageCategory: ''
			})
			await fetchTemplates()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update template')
		}
	}

	const handleSurveyJsonSave = (json: unknown) => {
		setEditingSurveyJson(json)
	}

	const handleDelete = async () => {
		if (!selectedTemplate) {
			return
		}
		setError('')

		try {
			const response = await fetch(`/api/formTemplates/${selectedTemplate.id}`, {
				method: 'DELETE'
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to delete template')
				return
			}

			setShowDeleteModal(false)
			setSelectedTemplate(null)
			await fetchTemplates()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete template')
		}
	}

	const openEditModal = (template: FormTemplate) => {
		setSelectedTemplate(template)
		setFormData({
			type: template.type,
			name: template.name,
			description: (template.description as string) || '',
			ageCategory: (template.ageCategory as '' | 'under18' | 'adult' | 'senior') || ''
		})
		setEditingSurveyJson(
			template.surveyJson || {
				title: template.name,
				pages: [{elements: []}]
			}
		)
		setShowEditModal(true)
	}

	const openDeleteModal = (template: FormTemplate) => {
		setSelectedTemplate(template)
		setShowDeleteModal(true)
	}

	const groupedTemplates = templates.reduce(
		(acc, template) => {
			const type = template.type
			if (!acc[type]) {
				acc[type] = []
			}
			acc[type].push(template)
			return acc
		},
		{} as Record<FormTemplateType, FormTemplate[]>
	)

	if (loading) {
		return (
			<div className='container mx-auto p-4'>
				<Spinner size='lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<div className='mb-4 flex items-center justify-between'>
				<h1 className='font-bold text-2xl'>Form Templates</h1>
				<Button
					variant='default'
					onClick={() => setShowCreateModal(true)}
					type='button'
					data-testid='button-create'
				>
					Create Template
				</Button>
			</div>

			{error && (
				<div className='mb-4 rounded-lg bg-destructive/15 p-4 text-destructive'>
					<span>{error}</span>
				</div>
			)}

			{/* Filter Tabs */}
			<Tabs
				value={filterType}
				onValueChange={(value: string) => setFilterType(value as FormTemplateType | 'all')}
				className='mb-4'
			>
				<TabsList>
					<TabsTrigger value='all'>All</TabsTrigger>
					<TabsTrigger value='consent'>Consent</TabsTrigger>
					<TabsTrigger value='demographics'>Demographics</TabsTrigger>
					<TabsTrigger value='survey'>Survey</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Templates List */}
			{filterType === 'all' ? (
				<div className='space-y-6'>
					{Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
						<div key={type}>
							<h2 className='mb-2 font-semibold text-xl capitalize'>{type}</h2>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
								{typeTemplates.map(template => (
									<Card className='shadow-xl' key={template.id}>
										<CardContent className='pt-6'>
											<h3 className='font-semibold text-lg'>{template.name}</h3>
											{template.description && (
												<p className='text-sm opacity-70'>{template.description}</p>
											)}
											{template.ageCategory && (
												<p className='text-xs opacity-60'>Age Category: {template.ageCategory}</p>
											)}
											<div className='mt-4 flex justify-end gap-2'>
												<Button
													size='sm'
													variant='default'
													onClick={() => openEditModal(template)}
													type='button'
													data-testid='button-edit'
												>
													Edit
												</Button>
												<Button
													size='sm'
													variant='destructive'
													onClick={() => openDeleteModal(template)}
													type='button'
													data-testid='button-delete'
												>
													Delete
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{templates.map(template => (
						<Card className='shadow-xl' key={template.id}>
							<CardContent className='pt-6'>
								<h3 className='font-semibold text-lg'>{template.name}</h3>
								{template.description && (
									<p className='text-sm opacity-70'>{template.description}</p>
								)}
								{template.ageCategory && (
									<p className='text-xs opacity-60'>Age Category: {template.ageCategory}</p>
								)}
								<div className='mt-4 flex justify-end gap-2'>
									<Button
										size='sm'
										variant='default'
										onClick={() => openEditModal(template)}
										type='button'
										data-testid='button-edit'
									>
										Edit
									</Button>
									<Button
										size='sm'
										variant='destructive'
										onClick={() => openDeleteModal(template)}
										type='button'
										data-testid='button-delete'
									>
										Delete
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{templates.length === 0 && !loading && (
				<div className='rounded-lg bg-blue-500/15 p-4 text-blue-700 dark:text-blue-300'>
					<span>No templates found. Create one to get started.</span>
				</div>
			)}

			{/* Create Modal */}
			{showCreateModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
					<div className='w-full max-w-md rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Create Form Template</h3>
						<form onSubmit={handleCreate}>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='create-type'>Type</Label>
								<Select
									value={formData.type}
									onValueChange={(value: string) =>
										setFormData({
											...formData,
											type: value as FormTemplateType
										})
									}
								>
									<SelectTrigger id='create-type'>
										<SelectValue placeholder='Select type' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='consent'>Consent</SelectItem>
										<SelectItem value='demographics'>Demographics</SelectItem>
										<SelectItem value='survey'>Survey</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='create-name'>Name</Label>
								<Input
									id='create-name'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setFormData({...formData, name: e.target.value})
									}
									required={true}
									type='text'
									value={formData.name}
								/>
							</div>
							{formData.type === 'demographics' && (
								<div className='mb-4 space-y-2'>
									<Label htmlFor='create-age-category'>Age Category</Label>
									<Select
										value={formData.ageCategory || 'none'}
										onValueChange={(value: string) =>
											setFormData({
												...formData,
												ageCategory:
													value === 'none' ? '' : (value as 'under18' | 'adult' | 'senior')
											})
										}
									>
										<SelectTrigger id='create-age-category'>
											<SelectValue placeholder='Select age category' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='none'>None</SelectItem>
											<SelectItem value='under18'>Under 18</SelectItem>
											<SelectItem value='adult'>Adult</SelectItem>
											<SelectItem value='senior'>Senior</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
							<div className='flex justify-end gap-2'>
								<Button
									variant='ghost'
									onClick={() => {
										setShowCreateModal(false)
										setFormData({
											type: 'consent',
											name: '',
											description: '',
											ageCategory: ''
										})
									}}
									type='button'
								>
									Cancel
								</Button>
								<Button variant='default' type='submit' data-testid='button-submit'>
									Create
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Modal */}
			{showEditModal && selectedTemplate && editingSurveyJson !== null && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
					<div className='max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Edit Form Template</h3>
						<form onSubmit={handleEdit}>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='edit-name'>Name</Label>
								<Input
									id='edit-name'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setFormData({...formData, name: e.target.value})
									}
									required={true}
									type='text'
									value={formData.name}
								/>
							</div>
							<div className='mb-4 space-y-2'>
								<Label>Form Builder</Label>
								<div className='rounded-lg border border-border bg-background p-4'>
									<SurveyCreatorComponent
										onSave={handleSurveyJsonSave}
										surveyJson={editingSurveyJson}
									/>
								</div>
							</div>
							<div className='flex justify-end gap-2'>
								<Button
									variant='ghost'
									onClick={() => {
										setShowEditModal(false)
										setSelectedTemplate(null)
										setEditingSurveyJson(null)
									}}
									type='button'
								>
									Cancel
								</Button>
								<Button variant='default' type='submit' data-testid='button-submit'>
									Save Template
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && selectedTemplate && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
					<div className='w-full max-w-md rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Delete Template</h3>
						<p>
							Are you sure you want to delete &quot;{selectedTemplate.name}
							&quot;? This action cannot be undone.
						</p>
						<div className='mt-4 flex justify-end gap-2'>
							<Button
								variant='ghost'
								onClick={() => {
									setShowDeleteModal(false)
									setSelectedTemplate(null)
								}}
								type='button'
							>
								Cancel
							</Button>
							<Button
								variant='destructive'
								onClick={handleDelete}
								type='button'
								data-testid='button-delete-confirm'
							>
								Delete
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
