import {HttpResponse, http} from 'msw'

export const handlers = [
	// Events API
	http.get('/api/events', () => {
		return HttpResponse.json({success: true, events: []})
	}),

	// Users/Profile API
	http.get('/api/users/*', () => {
		return HttpResponse.json({success: true})
	}),
	http.post('/api/users/*', () => {
		return HttpResponse.json({success: true})
	}),
	http.get('/api/profile', () => {
		return HttpResponse.json({success: true})
	}),

	// Admin API
	http.get('/api/admin/*', () => {
		return HttpResponse.json({success: true, data: []})
	}),

	// Forms API
	http.get('/api/forms/*', () => {
		return HttpResponse.json({success: true})
	}),
	http.post('/api/forms/*', () => {
		return HttpResponse.json({success: true})
	}),

	// Surveys API
	http.get('/api/surveys/*', () => {
		return HttpResponse.json({success: true, surveys: []})
	}),
	http.get('/api/surveyQuestions', () => {
		return HttpResponse.json({success: true, questions: []})
	}),

	// Event Types API
	http.get('/api/eventTypes', () => {
		return HttpResponse.json({success: true, eventTypes: []})
	}),

	// Form Templates API
	http.get('/api/formTemplates', () => {
		return HttpResponse.json({success: true, templates: []})
	})
]
