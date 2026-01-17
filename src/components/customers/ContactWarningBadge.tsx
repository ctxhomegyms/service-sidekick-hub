import { AlertTriangle, Phone, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContactWarningBadgeProps {
  hasPhone: boolean;
  hasEmail: boolean;
  compact?: boolean;
}

export function ContactWarningBadge({
  hasPhone,
  hasEmail,
  compact = false,
}: ContactWarningBadgeProps) {
  if (hasPhone && hasEmail) return null;

  const warnings: string[] = [];
  if (!hasPhone) warnings.push('No phone - SMS unavailable');
  if (!hasEmail) warnings.push('No email - Email unavailable');

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
              <AlertTriangle className="w-3 h-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {!hasPhone && (
        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
          <Phone className="w-3 h-3" />
          <span className="text-xs">No SMS</span>
        </Badge>
      )}
      {!hasEmail && (
        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
          <Mail className="w-3 h-3" />
          <span className="text-xs">No Email</span>
        </Badge>
      )}
    </div>
  );
}
