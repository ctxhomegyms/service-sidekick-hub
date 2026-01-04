-- Create enum for communication channels
CREATE TYPE public.communication_channel AS ENUM ('phone', 'sms', 'email');

-- Create enum for conversation status
CREATE TYPE public.conversation_status AS ENUM ('unread', 'read', 'responded', 'missed', 'closed');

-- Create enum for message direction
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');

-- Conversations table - each conversation thread
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  channel communication_channel NOT NULL,
  status conversation_status NOT NULL DEFAULT 'unread',
  subject TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation messages - individual messages in a conversation
CREATE TABLE public.conversation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  sender_name TEXT,
  sender_contact TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation notes - internal notes
CREATE TABLE public.conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversation tags junction table
CREATE TABLE public.conversation_tags (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Authenticated users can view conversations"
ON public.conversations FOR SELECT
USING (true);

CREATE POLICY "Admin/dispatcher can manage conversations"
ON public.conversations FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

-- RLS Policies for conversation_messages
CREATE POLICY "Authenticated users can view messages"
ON public.conversation_messages FOR SELECT
USING (true);

CREATE POLICY "Admin/dispatcher can manage messages"
ON public.conversation_messages FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

-- RLS Policies for conversation_notes
CREATE POLICY "Authenticated users can view notes"
ON public.conversation_notes FOR SELECT
USING (true);

CREATE POLICY "Admin/dispatcher can manage notes"
ON public.conversation_notes FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

CREATE POLICY "Users can add their own notes"
ON public.conversation_notes FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- RLS Policies for conversation_tags
CREATE POLICY "Authenticated users can view conversation tags"
ON public.conversation_tags FOR SELECT
USING (true);

CREATE POLICY "Admin/dispatcher can manage conversation tags"
ON public.conversation_tags FOR ALL
USING (is_admin_or_dispatcher(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update last_message_at when a new message is added
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_last_message_trigger
AFTER INSERT ON public.conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_last_message();

-- Create indexes for performance
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_channel ON public.conversations(channel);
CREATE INDEX idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX idx_conversation_notes_conversation_id ON public.conversation_notes(conversation_id);