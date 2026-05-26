'use client'

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3
  waiting?: boolean
}

const stepLabels = ['Plano', 'Clínica', 'Admin']

export function ProgressIndicator({ currentStep, waiting = false }: ProgressIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full transition-all ${
                step < currentStep
                  ? 'bg-primary'
                  : step === currentStep
                    ? waiting
                      ? 'bg-amber-400 ring-2 ring-amber-200'
                      : 'bg-primary ring-2 ring-primary/20'
                    : 'bg-muted-foreground/30'
              }`}
            />
            {i < 2 && (
              <div
                className={`h-0.5 w-8 transition-all ${step < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'}`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {waiting ? `Aguardando verificação` : `Passo ${currentStep} de 3`}
      </p>
    </div>
  )
}
