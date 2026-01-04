import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Phone, MessageSquare, Mail, AlertCircle } from "lucide-react";
import { normalizePhoneNumber, formatPhoneForDisplay } from "@/lib/phoneValidation";

type ConversationChannel = "phone" | "sms" | "email";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export default function NewConversationDialog({ open, onOpenChange, onCreated }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [channel, setChannel] = useState<ConversationChannel>("sms");
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .order("name");

    if (!error && data) {
      setCustomers(data);
    }
  };

  // Validate phone number when SMS channel is selected
  const selectedCustomer = customers.find(c => c.id === customerId);
  
  const phoneValidation = useMemo(() => {
    if (channel !== "sms") return null;
    if (!selectedCustomer?.phone) {
      return { isValid: false, normalized: null, error: "Customer has no phone number" };
    }
    return normalizePhoneNumber(selectedCustomer.phone);
  }, [channel, selectedCustomer?.phone]);

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    // Validate contact info for selected channel
    if (channel === "sms") {
      if (!phoneValidation?.isValid) {
        toast.error(phoneValidation?.error || "Invalid phone number for SMS");
        return;
      }
    }
    if (channel === "email" && !selectedCustomer?.email) {
      toast.error("Selected customer has no email address");
      return;
    }

    setLoading(true);
    try {
      // Create conversation
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .insert({
          customer_id: customerId,
          channel,
          subject: subject || null,
          status: "unread",
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add initial message if provided
      if (initialMessage.trim()) {
        const { error: msgError } = await supabase
          .from("conversation_messages")
          .insert({
            conversation_id: convData.id,
            direction: "outbound",
            content: initialMessage.trim(),
          });

        if (msgError) throw msgError;

        // Update status to responded
        await supabase
          .from("conversations")
          .update({ status: "responded" })
          .eq("id", convData.id);

        // Send via appropriate channel
        if (channel === "sms" && phoneValidation?.normalized) {
          const { data, error: smsError } = await supabase.functions.invoke("send-sms", {
            body: {
              to: phoneValidation.normalized, // Send normalized E.164 number
              message: initialMessage.trim(),
              conversationId: convData.id,
            },
          });

          if (smsError) {
            console.error("SMS send error:", smsError);
            toast.warning("Conversation created but SMS delivery failed");
          } else if (data?.status === "failed" || data?.status === "undelivered") {
            const code = data?.error_code ? ` (code ${data.error_code})` : "";
            toast.warning((data?.error_message || "SMS delivery failed") + code);
          } else if (data?.status === "queued" || data?.status === "sending") {
            toast.success("SMS queued");
          } else {
            toast.success("SMS sent");
          }
        }

        if (channel === "email" && selectedCustomer?.email) {
          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: {
              to: selectedCustomer.email,
              subject: subject || "New message",
              content: initialMessage.trim(),
            },
          });

          if (emailError) {
            console.error("Email send error:", emailError);
            toast.warning("Conversation created but email delivery failed");
          } else {
            toast.success("Email sent successfully");
          }
        }
      } else {
        toast.success("Conversation created");
      }

      resetForm();
      onCreated(convData.id);
    } catch (error: any) {
      toast.error("Failed to create conversation");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerId("");
    setChannel("sms");
    setSubject("");
    setInitialMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label>Channel *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={channel === "phone" ? "default" : "outline"}
                onClick={() => setChannel("phone")}
                className="flex-1"
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </Button>
              <Button
                type="button"
                variant={channel === "sms" ? "default" : "outline"}
                onClick={() => setChannel("sms")}
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </Button>
              <Button
                type="button"
                variant={channel === "email" ? "default" : "outline"}
                onClick={() => setChannel("email")}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>

          {/* Phone validation warning for SMS */}
          {channel === "sms" && customerId && phoneValidation && !phoneValidation.isValid && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Invalid phone number:</span>{" "}
                {phoneValidation.error}
                <br />
                <span className="text-xs text-muted-foreground">
                  Current: {selectedCustomer?.phone || "No phone"}
                </span>
              </div>
            </div>
          )}
          {/* Show normalized number for SMS */}
          {channel === "sms" && phoneValidation?.isValid && (
            <div className="text-xs text-muted-foreground">
              Will send to: <span className="font-mono">{formatPhoneForDisplay(phoneValidation.normalized!)}</span>
            </div>
          )}

          {/* Subject (optional) */}
          <div className="space-y-2">
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
            />
          </div>

          {/* Initial Message (optional) */}
          <div className="space-y-2">
            <Label>Initial Message (optional)</Label>
            <Textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Type your first message..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || (channel === "sms" && !phoneValidation?.isValid)}
            >
              {loading ? "Creating..." : "Create Conversation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
