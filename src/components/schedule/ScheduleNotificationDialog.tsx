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
import { Bell, X } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";

interface ScheduleNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  onConfirm: () => void;
  onSkip: () => void;
}

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

  const formatTime = (time: string | null) => {
    if (!time) return "";
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

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      if (rememberChoice) {
        localStorage.setItem("schedule_auto_notify", "true");
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
            <Bell className="h-5 w-5 text-primary" />
            Send Appointment Notification?
          </DialogTitle>
          <DialogDescription>
            Would you like to notify the customer about their scheduled appointment?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Notification Preview:</p>
            <p className="text-sm text-muted-foreground">
              "Hi {customerName || "Customer"}, your appointment has been scheduled for{" "}
              <span className="font-medium text-foreground">{formatDate(scheduledDate)}</span>
              {scheduledTime && (
                <>
                  {" "}at <span className="font-medium text-foreground">{formatTime(scheduledTime)}</span>
                </>
              )}
              . We look forward to seeing you!"
            </p>
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
            {isLoading ? "Sending..." : "Yes, send notification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
