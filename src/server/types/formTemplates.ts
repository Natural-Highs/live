/**
 * Type definitions for form template-related data structures
 * Replaces generic object types with descriptive interfaces
 */

export type FormTemplateTypeValue = 'consent' | 'demographics' | 'survey';

export interface FormTemplateCreationRequest {
  readonly type: FormTemplateTypeValue;
  readonly name: string;
  readonly questions?: readonly unknown[];
}

export interface FormTemplateUpdateRequest {
  readonly name?: string;
  readonly questions?: readonly unknown[];
}
