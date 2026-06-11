export interface ProgressStepperProps {
    steps: string[];
    currentStep: number;
    className?: string;
}
export declare const ProgressStepper: ({ steps, currentStep, className }: ProgressStepperProps) => JSX.Element;
