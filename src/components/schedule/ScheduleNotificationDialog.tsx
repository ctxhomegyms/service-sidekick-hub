import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, X, MessageSquare } from "lucide-react";
import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";

interface ScheduleNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  onConfirm: (templateId: string) => void;
  onSkip: () => void;
}

type TemplateId = 'friendly' | 'professional' | 'brief' | 'detailed';

interface MessageTemplate {
  id: TemplateId;
  name: string;
  getMessage: (name: string, date: string, time: string | null) => string;
}

const templates: MessageTemplate[] = [
  {
    id: 'friendly',
    name: 'Friendly',
    getMessage: (name, date, time) => 
      `Hi ${name}! 🎉 Great news - we've got you on the calendar for ${date}${time ? ` at ${time}` : ''}. We'll send a reminder before your appointment. Can't wait to see you!`,
  },
  {
    id: 'professional',
    name: 'Professional',
    getMessage: (name, date, time) => 
      `Hello ${name}, your appointment has been confirmed for ${date}${time ? ` at ${time}` : ''}. Please contact us if you need to make any changes. Thank you for choosing us.`,
  },
  {
    id: 'brief',
    name: 'Brief',
    getMessage: (name, date, time) => 
      `Hi ${name}, confirmed: ${date}${time ? ` at ${time}` : ''}. See you then!`,
  },
  {
    id: 'detailed',
    name: 'Detailed',
    getMessage: (name, date, time) => 
      `Hi ${name}, your service appointment is scheduled for ${date}${time ? ` at ${time}` : ''}. Your technician will notify you when they're on the way. Reply to this message if you have any questions or need to reschedule.`,
  },
];

export function ScheduleNotificationDialog({
  open,
  onOpenChange,
  customerName,
  scheduledDate,
  scheduledTime,
  onConfirm,
  onSkip,
}: ScheduleNotificationDialogProps) {
  const [rememberChoice, setRememberChoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('friendly');

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    try {
      return format(parseISO(date), "EEEE, MMMM d, yyyy");
    } catch {
      return date;
    }
  };

  const previewMessage = useMemo(() => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return '';
    
    const name = customerName || 'Customer';
    const date = formatDate(scheduledDate);
    const time = formatTime(scheduledTime);
    
    return template.getMessage(name, date, time);
  }, [selectedTemplate, customerName, scheduledDate, scheduledTime]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(selectedTemplate);
      if (rememberChoice) {
        localStorage.setItem("schedule_auto_notify", "true");
        localStorage.setItem("schedule_preferred_template", selectedTemplate);
      }
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    if (rememberChoice) {
      localStorage.setItem("schedule_auto_notify", "false");
    }
    onSkip();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Confirmation Message?
          </DialogTitle>
          <DialogDescription>
            Let the customer know they're on the calendar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <Label htmlFor="template" className="text-sm font-medium">
              Message Template
            </Label>
            <Select
              value={selectedTemplate}
              onValueChange={(value: TemplateId) => setSelectedTemplate(value)}
            >
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {previewMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberChoice}
              onCheckedChange={(checked) => setRememberChoice(checked === true)}
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              Remember my choice for future jobs
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            No, skip
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? "Sending..." : "Send message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
