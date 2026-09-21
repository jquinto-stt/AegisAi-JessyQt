import React from "react";

interface StepItem {
  num: number;
  label: string;
}

interface OnboardingStepperProps {
  steps: StepItem[];
  step: number;
  canProceed?: boolean;
  onSelect?: (step: number) => void;
}

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  steps,
  step,
  canProceed = true,
  onSelect,
}) => {
  return (
    <div className="mb-8 flex items-center gap-4">
      <div className="flex flex-1 items-center gap-2">
        {steps.map((s) => {
          const done = s.num < step;
          const active = s.num === step;
          const reachable = s.num < step || canProceed;

          return (
            <button
              key={s.num}
              type="button"
              disabled={!reachable || !onSelect}
              aria-label={s.label}
              onClick={() => reachable && onSelect && onSelect(s.num)}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                active
                  ? "bg-brand-500 shadow-theme-sm shadow-brand-500/30"
                  : done
                  ? "bg-brand-500/50"
                  : "bg-gray-200 dark:bg-gray-800"
              } ${reachable && onSelect ? "cursor-pointer" : "cursor-default"}`}
            />
          );
        })}
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
        {step}/{steps.length}
      </span>
    </div>
  );
};

export default OnboardingStepper;
