/**
 * Unit tests for template converter business logic
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 */
import type {SurveyJSJson} from '@/components/forms/SurveyRenderer'
import {
	convertSurveyJSToTemplate,
	convertTemplateToSurveyJS,
	type FormTemplate
} from './template-converter'

describe('Template Converter', () => {
	describe('convertTemplateToSurveyJS', () => {
		it('should return surveyJson directly if present', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [{elements: []}]
			}
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Template',
				surveyJson
			}

			const result = convertTemplateToSurveyJS(template)
			expect(result).toBe(surveyJson)
		})

		it('should convert questions array to SurveyJS format', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'What is your name?',
						type: 'text',
						required: true
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			expect(result.title).toBe('Test Form')
			expect(result.pages).toHaveLength(1)
			expect(result.pages[0].elements).toHaveLength(1)
			expect(result.pages[0].elements[0]).toMatchObject({
				type: 'text',
				name: 'q1',
				title: 'What is your name?',
				isRequired: true
			})
		})

		it('should convert checkbox questions correctly', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Select options',
						type: 'checkbox',
						options: ['Option 1', 'Option 2'],
						required: true
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'checkbox',
				name: 'q1',
				title: 'Select options',
				isRequired: true,
				choices: ['Option 1', 'Option 2']
			})
		})

		it('should convert radio questions correctly', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Choose one',
						type: 'radio',
						options: ['Yes', 'No'],
						required: true
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'radiogroup',
				name: 'q1',
				title: 'Choose one',
				isRequired: true,
				choices: ['Yes', 'No']
			})
		})

		it('should detect email fields and add email validator', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'What is your email?',
						type: 'text'
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'text',
				inputType: 'email',
				validators: [{type: 'email'}]
			})
		})

		it('should convert heading questions to HTML elements', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Section Header',
						type: 'heading'
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'html',
				name: 'q1'
			})
			expect(element.html).toContain('Section Header')
			expect(element.html).toContain('<h3')
		})

		it('should convert info questions to HTML paragraph elements', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'This is informational text',
						type: 'info'
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'html',
				name: 'q1'
			})
			expect(element.html).toContain('This is informational text')
			expect(element.html).toContain('<p')
			expect(element.html).not.toContain('<h3')
		})

		it('should convert paragraph questions to HTML paragraph elements', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'This is paragraph text',
						type: 'paragraph'
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'html',
				name: 'q1'
			})
			expect(element.html).toContain('This is paragraph text')
			expect(element.html).toContain('<p')
		})

		it('should convert unknown question type to comment/textarea (default fallback)', () => {
			// Use an invalid type that doesn't match any handler to trigger default path
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Enter your comments',
						// biome-ignore lint/suspicious/noExplicitAny: Testing default fallback requires invalid type
						type: 'unknown' as any // Invalid type that will fall through to default
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'comment',
				name: 'q1',
				title: 'Enter your comments',
				rows: 4
			})
		})

		it('should handle empty questions array', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: []
			}

			const result = convertTemplateToSurveyJS(template)
			expect(result.title).toBe('Test Form')
			expect(result.pages[0].elements).toHaveLength(0)
		})

		it('should generate IDs for questions without IDs', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						text: 'Question without ID',
						type: 'text'
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element.name).toBeDefined()
			expect(element.name).toMatch(/^question-/)
		})
	})

	describe('convertSurveyJSToTemplate', () => {
		it('should convert SurveyJS JSON to template format', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				description: 'Test Description',
				pages: [
					{
						elements: [
							{
								type: 'text',
								name: 'q1',
								title: 'What is your name?',
								isRequired: true
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.name).toBe('Test Form')
			expect(result.description).toBe('Test Description')
			expect(result.questions).toBeDefined()
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'q1',
				text: 'What is your name?',
				type: 'text',
				required: true
			})
		})

		it('should preserve existing template metadata', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [{elements: []}]
			}
			const existingTemplate: Partial<FormTemplate> = {
				id: 'template-123',
				type: 'survey',
				isActive: true
			}

			const result = convertSurveyJSToTemplate(surveyJson, existingTemplate)
			expect(result.id).toBe('template-123')
			expect(result.type).toBe('survey')
			expect(result.isActive).toBe(true)
		})

		it('should include surveyJson in result', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [{elements: []}]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.surveyJson).toBe(surveyJson)
		})

		it('should convert HTML elements with h3 tag to heading questions', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'html',
								name: 'heading1',
								html: '<h3>Section Header</h3>'
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'heading1',
				text: 'Section Header',
				type: 'heading'
			})
		})

		it('should convert HTML elements without h3 tag to info questions', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'html',
								name: 'info1',
								html: '<p>This is informational text</p>'
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'info1',
				text: 'This is informational text',
				type: 'info'
			})
		})

		it('should convert checkbox elements correctly', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'checkbox',
								name: 'q1',
								title: 'Select options',
								isRequired: true,
								choices: ['Option 1', 'Option 2'],
								hasOther: true
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'q1',
				text: 'Select options',
				type: 'checkbox',
				required: true,
				options: ['Option 1', 'Option 2'],
				allowOther: true
			})
		})

		it('should convert radiogroup elements correctly', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'radiogroup',
								name: 'q1',
								title: 'Choose one',
								isRequired: true,
								choices: ['Yes', 'No'],
								hasOther: false
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'q1',
				text: 'Choose one',
				type: 'radio',
				required: true,
				options: ['Yes', 'No'],
				allowOther: false
			})
		})

		it('should convert comment/textarea elements correctly', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'comment',
								name: 'q1',
								title: 'Enter your comments',
								isRequired: false,
								placeholder: 'Type here...',
								rows: 5
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'q1',
				text: 'Enter your comments',
				type: 'paragraph',
				required: false,
				placeholder: 'Type here...'
			})
		})

		it('should convert text input with placeholder correctly', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'text',
								name: 'q1',
								title: 'Enter your name',
								isRequired: true,
								placeholder: 'John Doe',
								inputType: 'text'
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'q1',
				text: 'Enter your name',
				type: 'text',
				required: true,
				placeholder: 'John Doe'
			})
		})

		it('should handle text input without placeholder', () => {
			const surveyJson: SurveyJSJson = {
				title: 'Test Form',
				pages: [
					{
						elements: [
							{
								type: 'text',
								name: 'q1',
								title: 'Enter your name',
								isRequired: false
							}
						]
					}
				]
			}

			const result = convertSurveyJSToTemplate(surveyJson)
			expect(result.questions).toHaveLength(1)
			expect(result.questions?.[0]).toMatchObject({
				id: 'q1',
				text: 'Enter your name',
				type: 'text',
				required: false
			})
			expect(result.questions?.[0]?.placeholder).toBeUndefined()
		})

		it('should handle checkbox with allowOther option', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Select options',
						type: 'checkbox',
						options: ['Option 1', 'Option 2'],
						allowOther: true,
						required: false
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'checkbox',
				name: 'q1',
				title: 'Select options',
				isRequired: false,
				choices: ['Option 1', 'Option 2'],
				hasOther: true
			})
		})

		it('should handle text input with placeholder in convertTemplateToSurveyJS', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Enter your name',
						type: 'text',
						placeholder: 'John Doe',
						required: false
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			expect(element).toMatchObject({
				type: 'text',
				name: 'q1',
				title: 'Enter your name',
				isRequired: false,
				placeholder: 'John Doe'
			})
		})

		it('should handle paragraph with placeholder in convertTemplateToSurveyJS', () => {
			const template: FormTemplate = {
				id: 'test-1',
				name: 'Test Form',
				questions: [
					{
						id: 'q1',
						text: 'Enter your comments',
						type: 'paragraph',
						placeholder: 'Type here...',
						required: false
					}
				]
			}

			const result = convertTemplateToSurveyJS(template)
			const element = result.pages[0].elements[0]
			// Paragraph type is converted to HTML element, not comment
			expect(element).toMatchObject({
				type: 'html',
				name: 'q1'
			})
			expect(element.html).toContain('Enter your comments')
			expect(element.html).toContain('<p')
		})
	})
})
