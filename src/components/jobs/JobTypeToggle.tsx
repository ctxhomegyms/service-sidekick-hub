import { cn } from '@/lib/utils';

interface JobTypeToggleProps {
  isRecurring: boolean;
  onChange: (isRecurring: boolean) => void;
}

export function JobTypeToggle({ isRecurring, onChange }: JobTypeToggleProps) {
  return (
    <div className="flex rounded-lg border bg-muted p-1">
      <button
        type="button"
        className={cn(
          'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all',
          !isRecurring 
            ? 'bg-background text-foreground shadow-sm' 
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onChange(false)}
      >
        One-off Job
      </button>
      <button
        type="button"
        className={cn(
          'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all',
          isRecurring 
            ? 'bg-background text-foreground shadow-sm' 
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onChange(true)}
      >
        Recurring Job
      </button>
    </div>
  );
}
