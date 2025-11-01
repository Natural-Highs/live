/**
 * Type definitions for survey-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface SurveyQuestionCreationRequest {
  readonly newQuestion: string;
  readonly surveyId: string;
}

export interface SurveyQuestionUpdateRequest {
  readonly question: {
    readonly questionText: string;
    readonly questionId: string;
  };
}

export interface SurveyQuestionDeleteRequest {
  readonly questionId: string;
}

export interface SurveyResponseSubmissionRequest {
  readonly surveyId: string;
  readonly responses: readonly SurveyQuestionResponse[];
}

export interface SurveyQuestionResponse {
  readonly questionId: string;
  readonly responseText: string;
}

export interface SurveyAdminUpdateRequest {
  readonly name?: string;
  readonly isActive?: boolean;
}

export interface SurveyCreationRequest {
  readonly surveyName: string;
}

export interface SurveyUpdateRequest {
  readonly newSurveyName: string;
}
