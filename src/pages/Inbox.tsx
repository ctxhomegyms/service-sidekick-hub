import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useResilientSubscription } from "@/hooks/useResilientSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  Wifi,
  WifiOff,
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
  phone: "bg-success/10 text-success",
  sms: "bg-info/10 text-info",
  email: "bg-secondary text-secondary-foreground",
  voicemail: "bg-warning/10 text-warning",
};

export default function Inbox() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [communications, setCommunications] = useState<UnifiedCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get("tab") as TabType) || "all");
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: CommunicationType } | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const fetchAllCommunications = async () => {
    try {
      setLoading(true);
      const allComms: UnifiedCommunication[] = [];

      // Conversations (SMS/Email/Phone conversations table)
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

      // Calls
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
            preview: `${call.direction === "inbound" ? "Incoming" : "Outgoing"} call • ${call.status}`,
            isUnread: isMissed,
            direction: call.direction,
            duration: call.duration_seconds,
          });
        }
      }

      // Voicemails (active only)
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
            preview: vm.transcription || "Voicemail received",
            isUnread: !vm.is_listened,
            duration: vm.duration_seconds,
          });
        }
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "all") setSearchParams({ tab: activeTab });
    else setSearchParams({});
  }, [activeTab, setSearchParams]);

  // Handle realtime updates with callback
  const handleRealtimeUpdate = useCallback(() => {
    fetchAllCommunications();
  }, []);

  // Use resilient subscriptions for all inbox tables
  const { status: conversationsStatus } = useResilientSubscription({
    channelName: 'inbox-conversations',
    table: 'conversations',
    onData: handleRealtimeUpdate,
    enabled: true,
  });

  const { status: messagesStatus } = useResilientSubscription({
    channelName: 'inbox-messages',
    table: 'conversation_messages',
    onData: handleRealtimeUpdate,
    enabled: true,
  });

  const { status: callsStatus } = useResilientSubscription({
    channelName: 'inbox-calls',
    table: 'call_log',
    onData: handleRealtimeUpdate,
    enabled: true,
  });

  const { status: voicemailsStatus } = useResilientSubscription({
    channelName: 'inbox-voicemails',
    table: 'voicemails',
    onData: handleRealtimeUpdate,
    enabled: true,
  });

  // Check if any subscription is disconnected
  const isRealtimeConnected = 
    conversationsStatus.isConnected && 
    messagesStatus.isConnected && 
    callsStatus.isConnected && 
    voicemailsStatus.isConnected;

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
    unread: communications.filter((c) => c.isUnread).length,
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallIcon = (item: UnifiedCommunication) => {
    if (item.status === "missed" || item.status === "no-answer") return <PhoneMissed className="h-4 w-4" />;
    if (item.direction === "inbound") return <PhoneIncoming className="h-4 w-4" />;
    return <PhoneOutgoing className="h-4 w-4" />;
  };

  const renderDetail = () => {
    if (!selectedItem) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select an item</h3>
            <p className="text-sm">Choose a message, call, or voicemail</p>
          </div>
        </div>
      );
    }

    if (selectedItem.type === "conversation") {
      return (
        <ConversationDetail
          conversationId={selectedItem.id}
          onUpdate={fetchAllCommunications}
          onClose={() => setSelectedItem(null)}
        />
      );
    }

    if (selectedItem.type === "call") {
      return <CallDetail callId={selectedItem.id} onClose={() => setSelectedItem(null)} />;
    }

    return (
      <VoicemailDetail
        voicemailId={selectedItem.id}
        onClose={() => setSelectedItem(null)}
        onUpdate={fetchAllCommunications}
      />
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row min-h-[70vh] md:min-h-0">
        {/* List */}
        {(!isMobile || !selectedItem) && (
          <div className="w-full md:w-96 md:border-r border-b md:border-b-0 flex flex-col bg-background">
            <div className="p-4 border-b space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold flex items-center gap-2">
                    Inbox
                    {!isRealtimeConnected && (
                      <span title="Reconnecting...">
                        <WifiOff className="h-4 w-4 text-warning" />
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-muted-foreground">{counts.unread} unread</p>
                </div>
                <Button size="sm" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="text-xs">
                    Msg
                  </TabsTrigger>
                  <TabsTrigger value="calls" className="text-xs">
                    Calls
                  </TabsTrigger>
                  <TabsTrigger value="voicemails" className="text-xs">
                    VM
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
                    onClick={() => setSelectedItem({ id: item.id, type: item.type })}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedItem?.id === item.id && selectedItem?.type === item.type ? "bg-muted" : ""
                    } ${item.isUnread ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${channelColors[item.channel]}`}>
                        {item.type === "call" ? getCallIcon(item) : channelIcons[item.channel]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate">
                            {item.customer_name || formatPhone(item.phone) || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.timestamp), "MMM d, h:mm a")}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground truncate">{item.preview}</p>

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
        )}

        {/* Detail */}
        {(!isMobile || selectedItem) && (
          <div className="flex-1 min-w-0 flex flex-col">{renderDetail()}</div>
        )}
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
