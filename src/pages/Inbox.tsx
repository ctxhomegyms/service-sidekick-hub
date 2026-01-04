import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Filter,
  Plus,
  User,
  Clock,
} from "lucide-react";
import ConversationDetail from "@/components/inbox/ConversationDetail";
import NewConversationDialog from "@/components/inbox/NewConversationDialog";

type ConversationChannel = "phone" | "sms" | "email";
type ConversationStatus = "unread" | "read" | "responded" | "missed" | "closed";

interface Conversation {
  id: string;
  customer_id: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  subject: string | null;
  assigned_to: string | null;
  last_message_at: string;
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
  last_message?: {
    content: string;
    direction: "inbound" | "outbound";
  } | null;
}

const channelIcons: Record<ConversationChannel, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
};

const channelColors: Record<ConversationChannel, string> = {
  phone: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sms: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  email: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusColors: Record<ConversationStatus, string> = {
  unread: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  read: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  responded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  missed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  closed: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

export default function Inbox() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ConversationChannel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const fetchConversations = async () => {
    try {
      let query = supabase
        .from("conversations")
        .select(`
          *,
          customer:customers(id, name, email, phone),
          assignee:profiles!conversations_assigned_to_fkey(id, full_name)
        `)
        .order("last_message_at", { ascending: false });

      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from("conversation_messages")
            .select("content, direction")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            ...conv,
            last_message: messages?.[0] || null,
          } as Conversation;
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error: any) {
      toast.error("Failed to fetch conversations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [channelFilter, statusFilter]);

  // Real-time subscription for conversations and messages
  useEffect(() => {
    const conversationsChannel = supabase
      .channel('inbox-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [channelFilter, statusFilter]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.customer?.name?.toLowerCase().includes(query) ||
      conv.customer?.email?.toLowerCase().includes(query) ||
      conv.customer?.phone?.toLowerCase().includes(query) ||
      conv.subject?.toLowerCase().includes(query) ||
      conv.last_message?.content?.toLowerCase().includes(query)
    );
  });

  const unreadCount = conversations.filter((c) => c.status === "unread").length;
  const missedCount = conversations.filter((c) => c.status === "missed").length;

  const handleConversationClick = (id: string) => {
    setSelectedConversation(id);
  };

  const handleConversationUpdate = () => {
    fetchConversations();
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Conversation List */}
        <div className="w-96 border-r flex flex-col bg-background">
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Inbox</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread, {missedCount} missed
                </p>
              </div>
              <Button size="sm" onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={channelFilter}
                onValueChange={(v) => setChannelFilter(v as ConversationChannel | "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ConversationStatus | "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation === conv.id ? "bg-muted" : ""
                  } ${conv.status === "unread" ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Channel Icon */}
                    <div
                      className={`p-2 rounded-full ${channelColors[conv.channel]}`}
                    >
                      {channelIcons[conv.channel]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">
                          {conv.customer?.name || "Unknown Contact"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conv.last_message_at), "MMM d, h:mm a")}
                        </span>
                      </div>

                      {conv.subject && (
                        <p className="text-sm font-medium truncate mb-1">
                          {conv.subject}
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message?.direction === "outbound" && "You: "}
                        {conv.last_message?.content || "No messages yet"}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusColors[conv.status]}`}
                        >
                          {conv.status}
                        </Badge>
                        {conv.assignee && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {conv.assignee.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Conversation Detail */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ConversationDetail
              conversationId={selectedConversation}
              onUpdate={handleConversationUpdate}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-sm">Choose a conversation from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={(id) => {
          setShowNewDialog(false);
          setSelectedConversation(id);
          fetchConversations();
        }}
      />
    </AppLayout>
  );
}
