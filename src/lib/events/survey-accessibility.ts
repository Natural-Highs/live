/**
 * Survey accessibility business logic
 * Determines when surveys become accessible based on event activation and timing rules
 */

export interface EventData {
  surveyAccessibleOverride?: boolean;
  surveyAccessibleAt?: Date | { toDate: () => Date };
}

/**
 * Check if surveys are accessible for an event
 * Surveys are accessible if:
 * - Override is enabled, OR
 * - surveyAccessibleAt time has passed
 *
 * @param eventData - Event data containing accessibility information
 * @param currentTime - Optional current time (defaults to now)
 * @returns True if surveys are accessible, false otherwise
 */
export function isSurveyAccessible(
  eventData: EventData | null | undefined,
  currentTime: Date = new Date()
): boolean {
  if (!eventData) {
    return false;
  }

  // Override takes precedence
  if (eventData.surveyAccessibleOverride) {
    return true;
  }

  // Check if survey accessible time has passed
  if (eventData.surveyAccessibleAt) {
    const accessibleAt =
      eventData.surveyAccessibleAt instanceof Date
        ? eventData.surveyAccessibleAt
        : eventData.surveyAccessibleAt.toDate();
    return accessibleAt <= currentTime;
  }

  return false;
}

/**
 * Calculate when surveys become accessible after event activation
 * Surveys become accessible 1 hour after activation
 *
 * @param activatedAt - Event activation timestamp
 * @returns Date when surveys become accessible
 */
export function calculateSurveyAccessibleTime(activatedAt: Date): Date {
  const oneHourInMs = 60 * 60 * 1000;
  return new Date(activatedAt.getTime() + oneHourInMs);
}
