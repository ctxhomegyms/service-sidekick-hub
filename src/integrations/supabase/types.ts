export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auto_reply_settings: {
        Row: {
          business_hours_only: boolean
          created_at: string
          delay_seconds: number
          id: string
          include_callback_link: boolean
          is_active: boolean
          message_template: string
          trigger_type: Database["public"]["Enums"]["auto_reply_trigger"]
          updated_at: string
        }
        Insert: {
          business_hours_only?: boolean
          created_at?: string
          delay_seconds?: number
          id?: string
          include_callback_link?: boolean
          is_active?: boolean
          message_template?: string
          trigger_type?: Database["public"]["Enums"]["auto_reply_trigger"]
          updated_at?: string
        }
        Update: {
          business_hours_only?: boolean
          created_at?: string
          delay_seconds?: number
          id?: string
          include_callback_link?: boolean
          is_active?: boolean
          message_template?: string
          trigger_type?: Database["public"]["Enums"]["auto_reply_trigger"]
          updated_at?: string
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          is_open: boolean
          open_time: string
          updated_at: string
        }
        Insert: {
          close_time?: string
          created_at?: string
          day_of_week: number
          id?: string
          is_open?: boolean
          open_time?: string
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_open?: boolean
          open_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_log: {
        Row: {
          answered_by: string | null
          call_sid: string | null
          created_at: string
          customer_id: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number | null
          ended_at: string | null
          forwarded_to: string | null
          from_number: string
          id: string
          menu_path: Json | null
          status: string
          to_number: string
        }
        Insert: {
          answered_by?: string | null
          call_sid?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          ended_at?: string | null
          forwarded_to?: string | null
          from_number: string
          id?: string
          menu_path?: Json | null
          status?: string
          to_number: string
        }
        Update: {
          answered_by?: string | null
          call_sid?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          ended_at?: string | null
          forwarded_to?: string | null
          from_number?: string
          id?: string
          menu_path?: Json | null
          status?: string
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_log_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recordings: {
        Row: {
          call_log_id: string | null
          call_sid: string | null
          caller_phone: string | null
          created_at: string
          customer_id: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number | null
          id: string
          recording_sid: string | null
          recording_url: string
          status: string
          storage_path: string | null
          transcription: string | null
        }
        Insert: {
          call_log_id?: string | null
          call_sid?: string | null
          caller_phone?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          id?: string
          recording_sid?: string | null
          recording_url: string
          status?: string
          storage_path?: string | null
          transcription?: string | null
        }
        Update: {
          call_log_id?: string | null
          call_sid?: string | null
          caller_phone?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          id?: string
          recording_sid?: string | null
          recording_url?: string
          status?: string
          storage_path?: string | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_recordings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          item_text: string
          item_type: string
          options: Json | null
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          item_text: string
          item_type?: string
          options?: Json | null
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          item_text?: string
          item_type?: string
          options?: Json | null
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          business_timezone: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_timezone?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_timezone?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          metadata: Json | null
          sender_contact: string | null
          sender_name: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          metadata?: Json | null
          sender_contact?: string | null
          sender_name?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          metadata?: Json | null
          sender_contact?: string | null
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          author_id: string
          conversation_id: string
          created_at: string
          id: string
          note_text: string
        }
        Insert: {
          author_id: string
          conversation_id: string
          created_at?: string
          id?: string
          note_text: string
        }
        Update: {
          author_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          conversation_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_required: boolean
          name: string
          options: Json | null
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          name: string
          options?: Json | null
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          name?: string
          options?: Json | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          shopify_customer_id: string | null
          sms_consent: boolean | null
          sms_consent_date: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          shopify_customer_id?: string | null
          sms_consent?: boolean | null
          sms_consent_date?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shopify_customer_id?: string | null
          sms_consent?: boolean | null
          sms_consent_date?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          notes: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          job_id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          job_id: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_activities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          job_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          job_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          job_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_checklist_items: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          image_url: string | null
          is_completed: boolean
          is_required: boolean
          item_text: string
          item_type: string
          job_id: string
          options: Json | null
          response_text: string | null
          response_value: Json | null
          signature_url: string | null
          sort_order: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_completed?: boolean
          is_required?: boolean
          item_text: string
          item_type?: string
          job_id: string
          options?: Json | null
          response_text?: string | null
          response_value?: Json | null
          signature_url?: string | null
          sort_order?: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_completed?: boolean
          is_required?: boolean
          item_text?: string
          item_type?: string
          job_id?: string
          options?: Json | null
          response_text?: string | null
          response_value?: Json | null
          signature_url?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_checklist_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_crew: {
        Row: {
          created_at: string
          is_primary: boolean
          job_id: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          job_id: string
          technician_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          job_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_crew_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_crew_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_custom_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          job_id: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          job_id: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          job_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_custom_field_values_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          job_id: string
          quantity: number
          sort_order: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          job_id: string
          quantity?: number
          sort_order?: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_line_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          job_id: string
          note_text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          job_id: string
          note_text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          job_id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string
          photo_type: string
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          photo_type: string
          photo_url: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: string
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_required_skills: {
        Row: {
          created_at: string
          job_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_required_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_required_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      job_signatures: {
        Row: {
          id: string
          job_id: string
          signature_url: string
          signed_at: string
          signer_name: string
        }
        Insert: {
          id?: string
          job_id: string
          signature_url: string
          signed_at?: string
          signer_name: string
        }
        Update: {
          id?: string
          job_id?: string
          signature_url?: string
          signed_at?: string
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_signatures_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tags: {
        Row: {
          created_at: string
          job_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tags_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      job_types: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          require_checklist_completion: boolean | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          require_checklist_completion?: boolean | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          require_checklist_completion?: boolean | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          actual_duration_minutes: number | null
          address: string | null
          assigned_technician_id: string | null
          city: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          estimated_duration_minutes: number | null
          id: string
          instructions: string | null
          is_recurring: boolean
          job_number: string | null
          job_type_id: string | null
          latitude: number | null
          longitude: number | null
          parent_job_id: string | null
          priority: Database["public"]["Enums"]["job_priority"]
          recurrence_pattern: Json | null
          review_request_sent_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_category: string | null
          started_at: string | null
          state: string | null
          status: Database["public"]["Enums"]["job_status"]
          time_window_end: string | null
          time_window_start: string | null
          title: string
          updated_at: string
          version: number | null
          zip_code: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          address?: string | null
          assigned_technician_id?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_recurring?: boolean
          job_number?: string | null
          job_type_id?: string | null
          latitude?: number | null
          longitude?: number | null
          parent_job_id?: string | null
          priority?: Database["public"]["Enums"]["job_priority"]
          recurrence_pattern?: Json | null
          review_request_sent_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_category?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          time_window_end?: string | null
          time_window_start?: string | null
          title: string
          updated_at?: string
          version?: number | null
          zip_code?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          address?: string | null
          assigned_technician_id?: string | null
          city?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_recurring?: boolean
          job_number?: string | null
          job_type_id?: string | null
          latitude?: number | null
          longitude?: number | null
          parent_job_id?: string | null
          priority?: Database["public"]["Enums"]["job_priority"]
          recurrence_pattern?: Json | null
          review_request_sent_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_category?: string | null
          started_at?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          time_window_end?: string | null
          time_window_start?: string | null
          title?: string
          updated_at?: string
          version?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_job_type_id_fkey"
            columns: ["job_type_id"]
            isOneToOne: false
            referencedRelation: "job_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          job_id: string
          notification_type: string
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          job_id: string
          notification_type: string
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          job_id?: string
          notification_type?: string
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          customer_id: string
          email_job_cancelled: boolean | null
          email_job_completed: boolean
          email_job_rescheduled: boolean | null
          email_job_scheduled: boolean
          email_technician_assigned: boolean | null
          email_technician_en_route: boolean
          id: string
          sms_job_cancelled: boolean | null
          sms_job_completed: boolean
          sms_job_rescheduled: boolean | null
          sms_job_scheduled: boolean
          sms_reminder_1h: boolean
          sms_reminder_24h: boolean
          sms_reminder_morning: boolean | null
          sms_technician_assigned: boolean | null
          sms_technician_en_route: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email_job_cancelled?: boolean | null
          email_job_completed?: boolean
          email_job_rescheduled?: boolean | null
          email_job_scheduled?: boolean
          email_technician_assigned?: boolean | null
          email_technician_en_route?: boolean
          id?: string
          sms_job_cancelled?: boolean | null
          sms_job_completed?: boolean
          sms_job_rescheduled?: boolean | null
          sms_job_scheduled?: boolean
          sms_reminder_1h?: boolean
          sms_reminder_24h?: boolean
          sms_reminder_morning?: boolean | null
          sms_technician_assigned?: boolean | null
          sms_technician_en_route?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email_job_cancelled?: boolean | null
          email_job_completed?: boolean
          email_job_rescheduled?: boolean | null
          email_job_scheduled?: boolean
          email_technician_assigned?: boolean | null
          email_technician_en_route?: boolean
          id?: string
          sms_job_cancelled?: boolean | null
          sms_job_completed?: boolean
          sms_job_rescheduled?: boolean | null
          sms_job_scheduled?: boolean
          sms_reminder_1h?: boolean
          sms_reminder_24h?: boolean
          sms_reminder_morning?: boolean | null
          sms_technician_assigned?: boolean | null
          sms_technician_en_route?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_menu_options: {
        Row: {
          action_data: Json | null
          action_type: Database["public"]["Enums"]["phone_menu_action_type"]
          announcement: string | null
          created_at: string
          digit: string
          id: string
          label: string
          menu_id: string
          sort_order: number
        }
        Insert: {
          action_data?: Json | null
          action_type: Database["public"]["Enums"]["phone_menu_action_type"]
          announcement?: string | null
          created_at?: string
          digit: string
          id?: string
          label: string
          menu_id: string
          sort_order?: number
        }
        Update: {
          action_data?: Json | null
          action_type?: Database["public"]["Enums"]["phone_menu_action_type"]
          announcement?: string | null
          created_at?: string
          digit?: string
          id?: string
          label?: string
          menu_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "phone_menu_options_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "phone_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_menus: {
        Row: {
          created_at: string
          created_by: string | null
          greeting_audio_url: string | null
          greeting_text: string | null
          id: string
          invalid_input_message: string | null
          is_active: boolean
          is_default: boolean
          max_attempts: number
          name: string
          timeout_action: string
          timeout_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          greeting_audio_url?: string | null
          greeting_text?: string | null
          id?: string
          invalid_input_message?: string | null
          is_active?: boolean
          is_default?: boolean
          max_attempts?: number
          name: string
          timeout_action?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          greeting_audio_url?: string | null
          greeting_text?: string | null
          id?: string
          invalid_input_message?: string | null
          is_active?: boolean
          is_default?: boolean
          max_attempts?: number
          name?: string
          timeout_action?: string
          timeout_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_menus_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_requests: {
        Row: {
          created_at: string | null
          door_widths: Json | null
          floor_level: string
          has_elevator: boolean | null
          has_stairs: boolean | null
          id: string
          item_location: string
          items_description: string
          job_id: string | null
          payment_username: string | null
          preferred_payment_method: string | null
          stairs_description: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          door_widths?: Json | null
          floor_level: string
          has_elevator?: boolean | null
          has_stairs?: boolean | null
          id?: string
          item_location: string
          items_description: string
          job_id?: string | null
          payment_username?: string | null
          preferred_payment_method?: string | null
          stairs_description?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          door_widths?: Json | null
          floor_level?: string
          has_elevator?: boolean | null
          has_stairs?: boolean | null
          id?: string
          item_location?: string
          items_description?: string
          job_id?: string | null
          payment_username?: string | null
          preferred_payment_method?: string | null
          stairs_description?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shopify_orders: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          order_data: Json | null
          shopify_order_id: string
          shopify_order_number: string
          synced_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          order_data?: Json | null
          shopify_order_id: string
          shopify_order_number: string
          synced_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          order_data?: Json | null
          shopify_order_id?: string
          shopify_order_number?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      technician_locations: {
        Row: {
          id: string
          is_on_shift: boolean
          latitude: number
          longitude: number
          technician_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          is_on_shift?: boolean
          latitude: number
          longitude: number
          technician_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_on_shift?: boolean
          latitude?: number
          longitude?: number
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_skills: {
        Row: {
          created_at: string
          skill_id: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          skill_id: string
          technician_id: string
        }
        Update: {
          created_at?: string
          skill_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_skills_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voicemail_settings: {
        Row: {
          created_at: string
          greeting_audio_url: string | null
          greeting_text: string | null
          id: string
          is_active: boolean
          max_length_seconds: number
          notification_email: string | null
          notification_sms: string | null
          transcribe: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          greeting_audio_url?: string | null
          greeting_text?: string | null
          id?: string
          is_active?: boolean
          max_length_seconds?: number
          notification_email?: string | null
          notification_sms?: string | null
          transcribe?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          greeting_audio_url?: string | null
          greeting_text?: string | null
          id?: string
          is_active?: boolean
          max_length_seconds?: number
          notification_email?: string | null
          notification_sms?: string | null
          transcribe?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      voicemails: {
        Row: {
          call_log_id: string | null
          call_sid: string | null
          caller_phone: string
          created_at: string
          customer_id: string | null
          duration_seconds: number | null
          id: string
          is_archived: boolean
          is_listened: boolean
          listened_at: string | null
          listened_by: string | null
          recording_sid: string | null
          recording_url: string | null
          storage_path: string | null
          transcription: string | null
        }
        Insert: {
          call_log_id?: string | null
          call_sid?: string | null
          caller_phone: string
          created_at?: string
          customer_id?: string | null
          duration_seconds?: number | null
          id?: string
          is_archived?: boolean
          is_listened?: boolean
          listened_at?: string | null
          listened_by?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          storage_path?: string | null
          transcription?: string | null
        }
        Update: {
          call_log_id?: string | null
          call_sid?: string | null
          caller_phone?: string
          created_at?: string
          customer_id?: string | null
          duration_seconds?: number | null
          id?: string
          is_archived?: boolean
          is_listened?: boolean
          listened_at?: string | null
          listened_by?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          storage_path?: string | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voicemails_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voicemails_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voicemails_listened_by_fkey"
            columns: ["listened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_technician_availability: {
        Args: {
          p_date: string
          p_end_time: string
          p_exclude_job_id?: string
          p_start_time: string
          p_technician_id: string
        }
        Returns: {
          customer_name: string
          end_time: string
          job_id: string
          job_title: string
          scheduled_date: string
          scheduled_time: string
        }[]
      }
      find_duplicate_customers: {
        Args: { p_email?: string; p_exclude_id?: string; p_phone?: string }
        Returns: {
          email: string
          id: string
          match_type: string
          name: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_within_business_hours: {
        Args: { check_timezone?: string }
        Returns: boolean
      }
      log_job_activity: {
        Args: {
          _activity_type: string
          _description: string
          _job_id: string
          _metadata?: Json
          _user_id: string
        }
        Returns: string
      }
      normalize_phone_number: { Args: { phone: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "technician"
      auto_reply_trigger: "missed_call" | "after_hours" | "busy" | "voicemail"
      call_direction: "inbound" | "outbound"
      communication_channel: "phone" | "sms" | "email"
      conversation_status: "unread" | "read" | "responded" | "missed" | "closed"
      job_priority: "low" | "medium" | "high" | "urgent"
      job_status:
        | "pending"
        | "scheduled"
        | "en_route"
        | "in_progress"
        | "completed"
        | "cancelled"
      message_direction: "inbound" | "outbound"
      phone_menu_action_type:
        | "forward_call"
        | "voicemail"
        | "submenu"
        | "sms_reply"
        | "play_message"
        | "business_hours_check"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "technician"],
      auto_reply_trigger: ["missed_call", "after_hours", "busy", "voicemail"],
      call_direction: ["inbound", "outbound"],
      communication_channel: ["phone", "sms", "email"],
      conversation_status: ["unread", "read", "responded", "missed", "closed"],
      job_priority: ["low", "medium", "high", "urgent"],
      job_status: [
        "pending",
        "scheduled",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
      ],
      message_direction: ["inbound", "outbound"],
      phone_menu_action_type: [
        "forward_call",
        "voicemail",
        "submenu",
        "sms_reply",
        "play_message",
        "business_hours_check",
      ],
    },
  },
} as const
