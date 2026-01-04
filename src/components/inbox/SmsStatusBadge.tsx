import { Badge } from "@/components/ui/badge";
import { Clock, Send, CheckCheck, AlertTriangle, Loader2 } from "lucide-react";

type SmsStatus = "queued" | "sending" | "sent" | "delivered" | "failed" | "undelivered" | string;

interface SmsStatusBadgeProps {
  status: SmsStatus | null | undefined;
  errorCode?: number | null;
}

const statusConfig: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
  className?: string;
}> = {
  queued: {
    label: "Queued",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  },
  sending: {
    label: "Sending",
    variant: "secondary",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "bg-muted text-muted-foreground",
  },
  sent: {
    label: "Sent",
    variant: "outline",
    icon: <Send className="h-3 w-3" />,
  },
  delivered: {
    label: "Delivered",
    variant: "outline",
    icon: <CheckCheck className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  undelivered: {
    label: "Undelivered",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export default function SmsStatusBadge({ status, errorCode }: SmsStatusBadgeProps) {
  if (!status) return null;

  const config = statusConfig[status] || {
    label: status,
    variant: "secondary" as const,
    icon: null,
    className: "",
  };

  return (
    <Badge 
      variant={config.variant} 
      className={`text-[10px] px-1.5 py-0 h-4 gap-1 font-normal ${config.className}`}
    >
      {config.icon}
      {config.label}
      {errorCode && <span className="opacity-70">({errorCode})</span>}
    </Badge>
  );
}
