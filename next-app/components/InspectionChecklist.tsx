"use client";

export interface InspectionStep {
  id: string;
  label: string;
  instruction: string;
  completed: boolean;
}

export const INSPECTION_STEPS: Omit<InspectionStep, "completed">[] = [
  { id: "front", label: "Front", instruction: "Please show the front of the item clearly to the camera." },
  { id: "back", label: "Back", instruction: "Now turn the item around and show the back." },
  { id: "bottom", label: "Bottom", instruction: "Show the bottom or underside of the item." },
  { id: "damage", label: "Damage closeup", instruction: "If you see any damage (scratches, dents, cracks), bring the camera close to show it clearly." },
  { id: "packaging", label: "Packaging", instruction: "Is the original box or packaging included? Show it if available, or say 'no packaging'." },
  { id: "accessories", label: "Accessories", instruction: "Are all original accessories included (cables, manuals, etc.)? Show them or say 'no accessories'." },
];

interface InspectionChecklistProps {
  steps: InspectionStep[];
  currentStepIndex: number;
}

export default function InspectionChecklist({ steps, currentStepIndex }: InspectionChecklistProps) {
  const completed = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const progress = (completed / total) * 100;

  return (
    <div className="inspection-checklist" aria-label="Inspection progress">
      <div className="inspection-checklist__progress-bar">
        <div
          className="inspection-checklist__progress-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
      <div className="inspection-checklist__steps">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`inspection-checklist__step ${
              step.completed
                ? "inspection-checklist__step--done"
                : i === currentStepIndex
                ? "inspection-checklist__step--active"
                : ""
            }`}
          >
            <span className="inspection-checklist__step-icon">
              {step.completed ? "✓" : i === currentStepIndex ? "●" : "○"}
            </span>
            <span className="inspection-checklist__step-label">{step.label}</span>
          </div>
        ))}
      </div>
      <div className="inspection-checklist__counter">
        {completed}/{total} complete
      </div>
    </div>
  );
}
