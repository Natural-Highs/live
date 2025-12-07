import { useEffect, useRef, useState } from 'react';
import 'survey-creator-core/survey-creator-core.min.css';
// Note: survey-core CSS is included by survey-creator-core, no need to import separately

interface SurveyCreatorProps {
  surveyJson: unknown;
  onSave: (json: unknown) => void;
  onCancel?: () => void;
}

/**
 * SurveyJS Creator component for visual form building
 *
 * Provides a visual form builder interface using SurveyJS Creator. Allows admins
 * to create and edit forms with a drag-and-drop interface. Dynamically loads
 * the SurveyJS Creator library to avoid blocking initial page load.
 *
 * @param props - Component props
 * @param props.surveyJson - Initial SurveyJS JSON configuration (can be empty object for new forms)
 * @param props.onSave - Callback function called when form is saved with the updated JSON
 * @param props.onCancel - Optional callback function called when cancel button is clicked
 *
 * @example
 * ```typescript
 * <SurveyCreatorComponent
 *   surveyJson={existingFormJson}
 *   onSave={(json) => {
 *     updateFormTemplate(templateId, json);
 *   }}
 *   onCancel={() => navigate('/admin/documents')}
 * />
 * ```
 */
export function SurveyCreatorComponent({ surveyJson, onSave, onCancel }: SurveyCreatorProps) {
  const creatorRef = useRef<HTMLDivElement>(null);
  const surveyCreatorRef = useRef<import('survey-creator-core').SurveyCreatorModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initCreator = async () => {
      if (!creatorRef.current || surveyCreatorRef.current) return;

      try {
        // Dynamic import to avoid blocking initial page load
        const { SurveyCreatorModel } = await import('survey-creator-core');

        if (!isMounted || !creatorRef.current) return;

        const options = {
          showLogicTab: true,
          showTranslationTab: false,
          showDesignerTab: true,
          showTestSurveyTab: true,
          showJSONEditorTab: true,
        };

        const creator = new SurveyCreatorModel(options);
        creator.JSON = surveyJson || {
          title: 'New Form',
          pages: [{ elements: [] }],
        };

        if (creatorRef.current) {
          creatorRef.current.appendChild(creator.rootElement);
          surveyCreatorRef.current = creator;
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load SurveyCreator:', error);
        setIsLoading(false);
      }
    };

    initCreator();

    return () => {
      isMounted = false;
      if (surveyCreatorRef.current) {
        surveyCreatorRef.current.dispose();
        surveyCreatorRef.current = null;
      }
    };
  }, [surveyJson]);

  const handleSave = () => {
    if (surveyCreatorRef.current) {
      onSave(surveyCreatorRef.current.JSON);
    }
  };

  if (isLoading) {
    return (
      <div className="survey-creator-container">
        <div className="flex items-center justify-center p-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-creator-container">
      <div className="flex justify-end gap-2 mb-4">
        {onCancel && (
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="button" className="btn btn-sm btn-primary" onClick={handleSave}>
          Save Form
        </button>
      </div>
      <div ref={creatorRef} className="survey-creator" />
    </div>
  );
}
