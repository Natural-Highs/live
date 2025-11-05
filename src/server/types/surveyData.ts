/**
 * Type definitions for survey-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export interface SurveyQuestion {
  readonly id: string;
  readonly questionText: string;
}

export interface QuestionResponse {
  readonly questionId: string;
  readonly responseText: string;
}

export interface QuestionResponseWithText extends QuestionResponse {
  readonly questionText: string;
}
