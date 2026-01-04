import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Phone,
  MessageSquare,
  Mail,
  Send,
  X,
  User,
  Tag,
  StickyNote,
  Clock,
  ArrowLeft,
  Plus,
  AlertCircle,
} from "lucide-react";
import { normalizePhoneNumber, formatPhoneForDisplay } from "@/lib/phoneValidation";
import SmsStatusBadge from "./SmsStatusBadge";

type ConversationChannel = "phone" | "sms" | "email";
type ConversationStatus = "unread" | "read" | "responded" | "missed" | "closed";
type MessageDirection = "inbound" | "outbound";

interface MessageMetadata {
  sid?: string;
  status?: string;
  to?: string;
  error_code?: number | null;
  error_message?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  sender_name: string | null;
  sender_contact: string | null;
  created_at: string;
  metadata?: MessageMetadata | Record<string, unknown> | null;
}

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
  };
}

interface ConversationTag {
  tag_id: string;
  tag: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface ConversationData {
  id: string;
  customer_id: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  subject: string | null;
  assigned_to: string | null;
  created_at: string;
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  assignee?: {
    id: string;
    full_name: string | null;
  } | null;
}

interface Props {
  conversationId: string;
  onUpdate: () => void;
  onClose: () => void;
}

const channelIcons: Record<ConversationChannel, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
};

const statusOptions: ConversationStatus[] = ["unread", "read", "responded", "missed", "closed"];

export default function ConversationDetail({ conversationId, onUpdate, onClose }: Props) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<ConversationTag[]>([]);
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch conversation
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select(`
          *,
          customer:customers(id, name, email, phone),
          assignee:profiles!conversations_assigned_to_fkey(id, full_name)
        `)
        .eq("id", conversationId)
        .single();

      if (convError) throw convError;
      setConversation(convData as ConversationData);

      // Mark as read if unread
      if (convData.status === "unread") {
        await supabase
          .from("conversations")
          .update({ status: "read" })
          .eq("id", conversationId);
        onUpdate();
      }

      // Fetch messages
      const { data: msgData, error: msgError } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;
      setMessages((msgData || []) as Message[]);

      // Fetch notes
      const { data: noteData, error: noteError } = await supabase
        .from("conversation_notes")
        .select(`
          *,
          author:profiles(id, full_name)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false });

      if (noteError) throw noteError;
      setNotes(noteData || []);

      // Fetch conversation tags
      const { data: tagData, error: tagError } = await supabase
        .from("conversation_tags")
        .select(`
          tag_id,
          tag:tags(id, name, color)
        `)
        .eq("conversation_id", conversationId);

      if (tagError) throw tagError;
      setTags(tagData || []);

      // Fetch all available tags
      const { data: allTagsData } = await supabase
        .from("tags")
        .select("id, name, color")
        .order("name");
      setAllTags(allTagsData || []);

      // Fetch technicians for assignment
      const { data: techData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      setTechnicians(techData || []);
    } catch (error: any) {
      toast.error("Failed to load conversation");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [conversationId]);

  // Real-time subscription for messages
  useEffect(() => {
    const messagesChannel = supabase
      .channel(`conversation-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Validate phone number for SMS sending (we prefer SMS regardless of conversation channel)
  const phoneValidation = useMemo(() => {
    if (!conversation?.customer?.phone) return null;
    return normalizePhoneNumber(conversation.customer.phone);
  }, [conversation?.customer?.phone]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !conversation) return;

    const smsCapable = !!phoneValidation?.isValid && !!phoneValidation?.normalized;
    const emailCapable = !!conversation.customer?.email;

    if (!smsCapable && !emailCapable) {
      toast.error(phoneValidation?.error || "No valid phone or email for this customer");
      return;
    }

    setSendingMessage(true);
    try {
      let usedSms = false;
      let usedEmail = false;
      let smsMeta:
        | { sid?: string; status?: string; to?: string; error_code?: number | null; error_message?: string | null }
        | null = null;

      // Prefer SMS first
      if (smsCapable && phoneValidation?.normalized) {
        usedSms = true;

        const { data, error: fnError } = await supabase.functions.invoke("send-sms", {
          body: {
            to: phoneValidation.normalized,
            message: newMessage.trim(),
            conversationId: conversationId,
          },
        });

        if (fnError) {
          console.error("Twilio SMS error:", fnError);
          throw new Error(fnError.message || "Failed to send SMS");
        }
        if (data?.error) throw new Error(data.error);

        smsMeta = {
          sid: data?.sid,
          status: data?.status,
          to: data?.to,
          error_code: data?.error_code ?? null,
          error_message: data?.error_message ?? null,
        };

        const smsFailed = data?.status === "failed" || data?.status === "undelivered";

        // If SMS fails, fall back to email when available
        if (smsFailed) {
          const code = data?.error_code ? ` (code ${data.error_code})` : "";

          if (emailCapable && conversation.customer?.email) {
            const { data: emailData, error: emailErr } = await supabase.functions.invoke("send-email", {
              body: {
                to: conversation.customer.email,
                subject: conversation.subject || "Message from Field Service",
                content: newMessage.trim(),
              },
            });

            if (emailErr) {
              console.error("Resend email error:", emailErr);
              toast.error((data?.error_message || "SMS delivery failed") + code);
              throw new Error(emailErr.message || "Failed to send email");
            }
            if (emailData?.error) throw new Error(emailData.error);

            usedEmail = true;
            toast.warning((data?.error_message || "SMS undelivered") + code + ". Sent email instead.");
          } else {
            toast.error((data?.error_message || "SMS delivery failed") + code);
          }
        } else if (data?.status === "queued" || data?.status === "sending") {
          toast.success("SMS queued");
        } else {
          toast.success("SMS sent");
        }
      } else if (emailCapable && conversation.customer?.email) {
        // No valid SMS; send email
        usedEmail = true;

        const { data, error: fnError } = await supabase.functions.invoke("send-email", {
          body: {
            to: conversation.customer.email,
            subject: conversation.subject || "Message from Field Service",
            content: newMessage.trim(),
          },
        });

        if (fnError) {
          console.error("Resend email error:", fnError);
          throw new Error(fnError.message || "Failed to send email");
        }
        if (data?.error) throw new Error(data.error);

        toast.success("Email sent");
      }

      // Save the message to the database (store SMS meta if we attempted SMS)
      const senderContact = usedSms
        ? conversation.customer?.phone
        : usedEmail
          ? conversation.customer?.email
          : null;

      const { error } = await supabase.from("conversation_messages").insert({
        conversation_id: conversationId,
        direction: "outbound" as MessageDirection,
        content: newMessage.trim(),
        sender_name: user.email,
        sender_contact: senderContact,
        metadata: usedSms ? smsMeta : null,
      });

      if (error) throw error;

      // Update status to responded
      await supabase.from("conversations").update({ status: "responded" }).eq("id", conversationId);

      setNewMessage("");
      fetchData();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setAddingNote(true);
    try {
      const { error } = await supabase.from("conversation_notes").insert({
        conversation_id: conversationId,
        author_id: user.id,
        note_text: newNote.trim(),
      });

      if (error) throw error;

      setNewNote("");
      fetchData();
      toast.success("Note added");
    } catch (error: any) {
      toast.error("Failed to add note");
      console.error(error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ status })
        .eq("id", conversationId);

      if (error) throw error;
      fetchData();
      onUpdate();
      toast.success("Status updated");
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const handleAssignmentChange = async (assignedTo: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_to: assignedTo === "unassigned" ? null : assignedTo })
        .eq("id", conversationId);

      if (error) throw error;
      fetchData();
      onUpdate();
      toast.success("Assignment updated");
    } catch (error: any) {
      toast.error("Failed to update assignment");
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from("conversation_tags").insert({
        conversation_id: conversationId,
        tag_id: tagId,
      });

      if (error) throw error;
      fetchData();
      toast.success("Tag added");
    } catch (error: any) {
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from("conversation_tags")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("tag_id", tagId);

      if (error) throw error;
      fetchData();
      toast.success("Tag removed");
    } catch (error: any) {
      toast.error("Failed to remove tag");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const availableTags = allTags.filter(
    (t) => !tags.some((ct) => ct.tag_id === t.id)
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              {channelIcons[conversation.channel]}
              <span className="font-semibold">
                {conversation.customer?.name || "Unknown Contact"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={conversation.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={conversation.assigned_to || "unassigned"}
              onValueChange={handleAssignmentChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name || tech.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {conversation.customer?.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {conversation.customer.email}
            </span>
          )}
          {conversation.customer?.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {conversation.customer.phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Created {format(new Date(conversation.created_at), "MMM d, yyyy")}
          </span>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {tags.map((ct) => (
            <Badge
              key={ct.tag_id}
              variant="secondary"
              className="cursor-pointer"
              style={{ backgroundColor: ct.tag.color || undefined }}
              onClick={() => handleRemoveTag(ct.tag_id)}
            >
              {ct.tag.name} ×
            </Badge>
          ))}
          {availableTags.length > 0 && (
            <Select onValueChange={handleAddTag}>
              <SelectTrigger className="w-auto h-6 text-xs">
                <Plus className="h-3 w-3" />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="flex-1 flex flex-col mt-0">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet</p>
            ) : (
              messages.map((msg) => {
                const meta = msg.metadata as MessageMetadata | null;
                const showSmsStatus = msg.direction === "outbound" && typeof meta?.status === "string";
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.direction === "outbound"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div
                        className={`flex items-center gap-2 mt-1 ${
                          msg.direction === "outbound"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs">
                          {msg.sender_name && `${msg.sender_name} • `}
                          {format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </span>
                        {showSmsStatus && (
                          <SmsStatusBadge 
                            status={meta?.status} 
                            errorCode={meta?.error_code} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            {/* SMS preference + validation */}
            {phoneValidation && !phoneValidation.isValid && !conversation.customer?.email && (
              <div className="mb-3 flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Can’t send:</span> {phoneValidation.error}
                  <br />
                  <span className="text-xs text-muted-foreground">No email on file to fall back to.</span>
                </div>
              </div>
            )}

            {phoneValidation && !phoneValidation.isValid && !!conversation.customer?.email && (
              <div className="mb-3 flex items-start gap-2 p-2 bg-muted border border-border rounded-md text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">SMS unavailable:</span> {phoneValidation.error}
                  <br />
                  <span className="text-xs">Will send email to {conversation.customer.email}.</span>
                </div>
              </div>
            )}

            {phoneValidation?.isValid && (
              <div className="mb-2 text-xs text-muted-foreground">
                Sending SMS to:{" "}
                <span className="font-mono">{formatPhoneForDisplay(phoneValidation.normalized!)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={
                  sendingMessage ||
                  !newMessage.trim() ||
                  (!phoneValidation?.isValid && !conversation.customer?.email)
                }
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 flex flex-col mt-0">
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {notes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No internal notes yet</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.author?.full_name || "Unknown"} •{" "}
                    {format(new Date(note.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Note Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add an internal note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px]"
              />
              <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
