import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  MessageSquare,
  Mail,
  Voicemail,
  Search,
  Plus,
  User,
  Clock,
  Play,
  Pause,
} from "lucide-react";
import ConversationDetail from "@/components/inbox/ConversationDetail";
import CallDetail from "@/components/inbox/CallDetail";
import VoicemailDetail from "@/components/inbox/VoicemailDetail";
import NewConversationDialog from "@/components/inbox/NewConversationDialog";

type CommunicationType = "conversation" | "call" | "voicemail";
type TabType = "all" | "messages" | "calls" | "voicemails";

interface UnifiedCommunication {
  id: string;
  type: CommunicationType;
  customer_id: string | null;
  customer_name: string | null;
  phone: string | null;
  channel: "sms" | "email" | "phone" | "voicemail";
  status: string;
  timestamp: string;
  preview: string;
  isUnread: boolean;
  direction?: "inbound" | "outbound";
  duration?: number | null;
}

const channelIcons: Record<string, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  voicemail: <Voicemail className="h-4 w-4" />,
};

const channelColors: Record<string, string> = {
  phone: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sms: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  email: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  voicemail: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function Inbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [communications, setCommunications] = useState<UnifiedCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "all"
  );
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: CommunicationType } | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  
  // Audio for voicemails
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAllCommunications = async () => {
    try {
      setLoading(true);
      const allComms: UnifiedCommunication[] = [];

      // Fetch conversations (messages)
      if (activeTab === "all" || activeTab === "messages") {
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select(`
            *,
            customer:customers(id, name, phone)
          `)
          .order("last_message_at", { ascending: false })
          .limit(50);

        if (convError) throw convError;

        // Fetch last message for each conversation
        for (const conv of conversations || []) {
          const { data: messages } = await supabase
            .from("conversation_messages")
            .select("content, direction")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          allComms.push({
            id: conv.id,
            type: "conversation",
            customer_id: conv.customer_id,
            customer_name: conv.customer?.name || null,
            phone: conv.customer?.phone || null,
            channel: conv.channel as "sms" | "email" | "phone",
            status: conv.status,
            timestamp: conv.last_message_at || conv.created_at,
            preview: messages?.[0]?.content || conv.subject || "No messages",
            isUnread: conv.status === "unread",
          });
        }
      }

      // Fetch calls
      if (activeTab === "all" || activeTab === "calls") {
        const { data: calls, error: callError } = await supabase
          .from("call_log")
          .select(`
            *,
            customer:customers(id, name, phone)
          `)
          .order("created_at", { ascending: false })
          .limit(50);

        if (callError) throw callError;

        for (const call of calls || []) {
          const isMissed = call.status === "missed" || call.status === "no-answer";
          allComms.push({
            id: call.id,
            type: "call",
            customer_id: call.customer_id,
            customer_name: call.customer?.name || null,
            phone: call.direction === "inbound" ? call.from_number : call.to_number,
            channel: "phone",
            status: call.status,
            timestamp: call.created_at,
            preview: `${call.direction === "inbound" ? "Incoming" : "Outgoing"} call - ${call.status}`,
            isUnread: isMissed,
            direction: call.direction,
            duration: call.duration_seconds,
          });
        }
      }

      // Fetch voicemails
      if (activeTab === "all" || activeTab === "voicemails") {
        const { data: voicemails, error: vmError } = await supabase
          .from("voicemails")
          .select(`
            *,
            customer:customers(id, name)
          `)
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(50);

        if (vmError) throw vmError;

        for (const vm of voicemails || []) {
          allComms.push({
            id: vm.id,
            type: "voicemail",
            customer_id: vm.customer_id,
            customer_name: vm.customer?.name || null,
            phone: vm.caller_phone,
            channel: "voicemail",
            status: vm.is_listened ? "listened" : "new",
            timestamp: vm.created_at,
            preview: vm.transcription || "No transcription available",
            isUnread: !vm.is_listened,
            duration: vm.duration_seconds,
          });
        }
      }

      // Sort all by timestamp
      allComms.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setCommunications(allComms);
    } catch (error: any) {
      toast.error("Failed to fetch communications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCommunications();
  }, [activeTab]);

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab !== "all") {
      setSearchParams({ tab: activeTab });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('unified-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchAllCommunications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_messages' }, fetchAllCommunications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_log' }, fetchAllCommunications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voicemails' }, fetchAllCommunications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const filteredCommunications = communications.filter((comm) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      comm.customer_name?.toLowerCase().includes(query) ||
      comm.phone?.toLowerCase().includes(query) ||
      comm.preview?.toLowerCase().includes(query)
    );
  });

  const counts = {
    unread: communications.filter(c => c.isUnread).length,
    messages: communications.filter(c => c.type === "conversation").length,
    calls: communications.filter(c => c.type === "call").length,
    voicemails: communications.filter(c => c.type === "voicemail").length,
  };

  const handleItemClick = (item: UnifiedCommunication) => {
    setSelectedItem({ id: item.id, type: item.type });
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (item: UnifiedCommunication) => {
    if (item.status === "missed" || item.status === "no-answer") {
      return <PhoneMissed className="h-4 w-4" />;
    }
    if (item.direction === "inbound") {
      return <PhoneIncoming className="h-4 w-4" />;
    }
    return <PhoneOutgoing className="h-4 w-4" />;
  };

  const renderDetail = () => {
    if (!selectedItem) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
            <p className="text-sm">Choose an item from the list to view details</p>
          </div>
        </div>
      );
    }

    switch (selectedItem.type) {
      case "conversation":
        return (
          <ConversationDetail
            conversationId={selectedItem.id}
            onUpdate={fetchAllCommunications}
            onClose={() => setSelectedItem(null)}
          />
        );
      case "call":
        return (
          <CallDetail
            callId={selectedItem.id}
            onClose={() => setSelectedItem(null)}
          />
        );
      case "voicemail":
        return (
          <VoicemailDetail
            voicemailId={selectedItem.id}
            onClose={() => setSelectedItem(null)}
            onUpdate={fetchAllCommunications}
          />
        );
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Communication List */}
        <div className="w-96 border-r flex flex-col bg-background">
          {/* Header */}
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Inbox</h1>
                <p className="text-sm text-muted-foreground">
                  {counts.unread} unread
                </p>
              </div>
              <Button size="sm" onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="messages" className="text-xs">Messages</TabsTrigger>
                <TabsTrigger value="calls" className="text-xs">Calls</TabsTrigger>
                <TabsTrigger value="voicemails" className="text-xs">Voicemails</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Communication List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredCommunications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No communications found</p>
              </div>
            ) : (
              filteredCommunications.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedItem?.id === item.id && selectedItem?.type === item.type ? "bg-muted" : ""
                  } ${item.isUnread ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Channel Icon */}
                    <div className={`p-2 rounded-full ${channelColors[item.channel]}`}>
                      {item.type === "call" ? getCallIcon(item) : channelIcons[item.channel]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">
                          {item.customer_name || formatPhone(item.phone) || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground truncate">
                        {item.preview}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        {item.isUnread && (
                          <Badge variant="default" className="text-xs">
                            {item.type === "voicemail" ? "New" : item.type === "call" ? "Missed" : "Unread"}
                          </Badge>
                        )}
                        {item.duration !== undefined && item.duration !== null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(item.duration)}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.channel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Detail View */}
        <div className="flex-1 flex flex-col">
          {renderDetail()}
        </div>
      </div>

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreated={(id) => {
          setShowNewDialog(false);
          setSelectedItem({ id, type: "conversation" });
          fetchAllCommunications();
        }}
      />
    </AppLayout>
  );
}
