import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, Mail, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerId: string | null;
  jobId?: string;
}

export function QuickMessageDialog({
  open,
  onOpenChange,
  customerName,
  customerPhone,
  customerEmail,
  customerId,
  jobId,
}: QuickMessageDialogProps) {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">(customerPhone ? "sms" : "email");
  const [isSending, setIsSending] = useState(false);

  const canSendSms = !!customerPhone;
  const canSendEmail = !!customerEmail;

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSending(true);
    try {
      if (channel === "sms" && customerPhone) {
        const { error } = await supabase.functions.invoke("send-sms", {
          body: {
            to: customerPhone,
            message: message.trim(),
          },
        });

        if (error) throw error;

        // Create conversation record
        if (customerId) {
          const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .insert({
              customer_id: customerId,
              channel: "sms",
              status: "responded",
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!convError && conversation) {
            await supabase.from("conversation_messages").insert({
              conversation_id: conversation.id,
              content: message.trim(),
              direction: "outbound",
              sender_contact: customerPhone,
            });
          }
        }

        toast.success("SMS sent successfully");
      } else if (channel === "email" && customerEmail) {
        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            to: customerEmail,
            subject: "Message from FixAGym Field",
            html: `<p>${message.trim().replace(/\n/g, "<br>")}</p>`,
          },
        });

        if (error) throw error;

        // Create conversation record
        if (customerId) {
          const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .insert({
              customer_id: customerId,
              channel: "email",
              status: "responded",
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!convError && conversation) {
            await supabase.from("conversation_messages").insert({
              conversation_id: conversation.id,
              content: message.trim(),
              direction: "outbound",
              sender_contact: customerEmail,
            });
          }
        }

        toast.success("Email sent successfully");
      }

      setMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Quick Message
          </DialogTitle>
          <DialogDescription>
            Send a message to {customerName || "customer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(canSendSms || canSendEmail) && (
            <div className="space-y-2">
              <Label>Send via</Label>
              <RadioGroup
                value={channel}
                onValueChange={(value) => setChannel(value as "sms" | "email")}
                className="flex gap-4"
              >
                {canSendSms && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms" className="flex items-center gap-1 cursor-pointer">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </Label>
                  </div>
                )}
                {canSendEmail && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {channel === "sms" && (
              <p className="text-xs text-muted-foreground">
                {message.length}/160 characters
              </p>
            )}
          </div>

          {!canSendSms && !canSendEmail && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                No contact information available for this customer.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !message.trim() || (!canSendSms && !canSendEmail)}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
