import {createFileRoute} from '@tanstack/react-router'
import {useCallback, useEffect, useState} from 'react'
import {SurveyCreatorComponent} from '@/components/forms/SurveyCreator'

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

export const Route = createFileRoute('/_admin/templates')({
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
	const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
		null
	)
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
				filterType === 'all'
					? '/api/formTemplates'
					: `/api/formTemplates?type=${filterType}`
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
		if (!selectedTemplate) return
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
				updatePayload.questions = selectedTemplate.questions
					? [...selectedTemplate.questions]
					: []
			}

			const response = await fetch(
				`/api/formTemplates/${selectedTemplate.id}`,
				{
					method: 'PATCH',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(updatePayload)
				}
			)

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
		if (!selectedTemplate) return
		setError('')

		try {
			const response = await fetch(
				`/api/formTemplates/${selectedTemplate.id}`,
				{
					method: 'DELETE'
				}
			)

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
			ageCategory:
				(template.ageCategory as '' | 'under18' | 'adult' | 'senior') || ''
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
				<span className='loading loading-spinner loading-lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<div className='mb-4 flex items-center justify-between'>
				<h1 className='font-bold text-2xl'>Form Templates</h1>
				<button
					className='btn btn-primary'
					onClick={() => setShowCreateModal(true)}
					type='button'
				>
					Create Template
				</button>
			</div>

			{error && (
				<div className='alert alert-error mb-4'>
					<span>{error}</span>
				</div>
			)}

			{/* Filter Tabs */}
			<div className='tabs tabs-boxed mb-4'>
				<button
					className={`tab ${filterType === 'all' ? 'tab-active' : ''}`}
					onClick={() => setFilterType('all')}
					type='button'
				>
					All
				</button>
				<button
					className={`tab ${filterType === 'consent' ? 'tab-active' : ''}`}
					onClick={() => setFilterType('consent')}
					type='button'
				>
					Consent
				</button>
				<button
					className={`tab ${filterType === 'demographics' ? 'tab-active' : ''}`}
					onClick={() => setFilterType('demographics')}
					type='button'
				>
					Demographics
				</button>
				<button
					className={`tab ${filterType === 'survey' ? 'tab-active' : ''}`}
					onClick={() => setFilterType('survey')}
					type='button'
				>
					Survey
				</button>
			</div>

			{/* Templates List */}
			{filterType === 'all' ? (
				<div className='space-y-6'>
					{Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
						<div key={type}>
							<h2 className='mb-2 font-semibold text-xl capitalize'>{type}</h2>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
								{typeTemplates.map(template => (
									<div className='card bg-base-200 shadow-xl' key={template.id}>
										<div className='card-body'>
											<h3 className='card-title'>{template.name}</h3>
											{template.description && (
												<p className='text-sm opacity-70'>
													{template.description}
												</p>
											)}
											{template.ageCategory && (
												<p className='text-xs opacity-60'>
													Age Category: {template.ageCategory}
												</p>
											)}
											<div className='card-actions mt-4 justify-end'>
												<button
													className='btn btn-sm btn-primary'
													onClick={() => openEditModal(template)}
													type='button'
												>
													Edit
												</button>
												<button
													className='btn btn-sm btn-error'
													onClick={() => openDeleteModal(template)}
													type='button'
												>
													Delete
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			) : (
				<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{templates.map(template => (
						<div className='card bg-base-200 shadow-xl' key={template.id}>
							<div className='card-body'>
								<h3 className='card-title'>{template.name}</h3>
								{template.description && (
									<p className='text-sm opacity-70'>{template.description}</p>
								)}
								{template.ageCategory && (
									<p className='text-xs opacity-60'>
										Age Category: {template.ageCategory}
									</p>
								)}
								<div className='card-actions mt-4 justify-end'>
									<button
										className='btn btn-sm btn-primary'
										onClick={() => openEditModal(template)}
										type='button'
									>
										Edit
									</button>
									<button
										className='btn btn-sm btn-error'
										onClick={() => openDeleteModal(template)}
										type='button'
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{templates.length === 0 && !loading && (
				<div className='alert alert-info'>
					<span>No templates found. Create one to get started.</span>
				</div>
			)}

			{/* Create Modal */}
			{showCreateModal && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Create Form Template</h3>
						<form onSubmit={handleCreate}>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='create-type'>
									<span className='label-text'>Type</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='create-type'
									onChange={e =>
										setFormData({
											...formData,
											type: e.target.value as FormTemplateType
										})
									}
									required={true}
									value={formData.type}
								>
									<option value='consent'>Consent</option>
									<option value='demographics'>Demographics</option>
									<option value='survey'>Survey</option>
								</select>
							</div>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='create-name'>
									<span className='label-text'>Name</span>
								</label>
								<input
									className='input input-bordered w-full'
									id='create-name'
									onChange={e =>
										setFormData({...formData, name: e.target.value})
									}
									required={true}
									type='text'
									value={formData.name}
								/>
							</div>
							{formData.type === 'demographics' && (
								<div className='form-control mb-4'>
									<label className='label' htmlFor='create-age-category'>
										<span className='label-text'>Age Category</span>
									</label>
									<select
										className='select select-bordered w-full'
										id='create-age-category'
										onChange={e =>
											setFormData({
												...formData,
												ageCategory: e.target.value as
													| ''
													| 'under18'
													| 'adult'
													| 'senior'
											})
										}
										value={formData.ageCategory}
									>
										<option value=''>None</option>
										<option value='under18'>Under 18</option>
										<option value='adult'>Adult</option>
										<option value='senior'>Senior</option>
									</select>
								</div>
							)}
							<div className='modal-action'>
								<button
									className='btn'
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
								</button>
								<button className='btn btn-primary' type='submit'>
									Create
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Modal */}
			{showEditModal && selectedTemplate && editingSurveyJson !== null && (
				<div className='modal modal-open'>
					<div className='modal-box max-h-[90vh] w-full max-w-6xl overflow-y-auto'>
						<h3 className='mb-4 font-bold text-lg'>Edit Form Template</h3>
						<form onSubmit={handleEdit}>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='edit-name'>
									<span className='label-text'>Name</span>
								</label>
								<input
									className='input input-bordered w-full'
									id='edit-name'
									onChange={e =>
										setFormData({...formData, name: e.target.value})
									}
									required={true}
									type='text'
									value={formData.name}
								/>
							</div>
							<div className='form-control mb-4'>
								<div className='label'>
									<span className='label-text'>Form Builder</span>
								</div>
								<div className='rounded-lg border border-base-300 bg-base-100 p-4'>
									<SurveyCreatorComponent
										onSave={handleSurveyJsonSave}
										surveyJson={editingSurveyJson}
									/>
								</div>
							</div>
							<div className='modal-action'>
								<button
									className='btn'
									onClick={() => {
										setShowEditModal(false)
										setSelectedTemplate(null)
										setEditingSurveyJson(null)
									}}
									type='button'
								>
									Cancel
								</button>
								<button className='btn btn-primary' type='submit'>
									Save Template
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && selectedTemplate && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Delete Template</h3>
						<p>
							Are you sure you want to delete &quot;{selectedTemplate.name}
							&quot;? This action cannot be undone.
						</p>
						<div className='modal-action'>
							<button
								className='btn'
								onClick={() => {
									setShowDeleteModal(false)
									setSelectedTemplate(null)
								}}
								type='button'
							>
								Cancel
							</button>
							<button
								className='btn btn-error'
								onClick={handleDelete}
								type='button'
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
