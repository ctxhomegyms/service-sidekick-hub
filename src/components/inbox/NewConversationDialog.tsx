import { useState, useEffect } from "react";
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
import { Phone, MessageSquare, Mail } from "lucide-react";

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
  const [channel, setChannel] = useState<ConversationChannel>("email");
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

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }

    const selectedCustomer = customers.find(c => c.id === customerId);

    // Validate contact info for selected channel
    if (channel === "sms" && !selectedCustomer?.phone) {
      toast.error("Selected customer has no phone number for SMS");
      return;
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
        if (channel === "sms" && selectedCustomer?.phone) {
          const { error: smsError } = await supabase.functions.invoke("send-sms", {
            body: {
              to: selectedCustomer.phone,
              message: initialMessage.trim(),
              conversationId: convData.id,
            },
          });

          if (smsError) {
            console.error("SMS send error:", smsError);
            toast.warning("Conversation created but SMS delivery failed");
          } else {
            toast.success("SMS sent successfully");
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
    setChannel("email");
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
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create Conversation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
