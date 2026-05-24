export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      answer_choices: {
        Row: {
          choice_text: string;
          id: string;
          is_correct: boolean;
          letter: Database["public"]["Enums"]["answer_letter"];
          question_id: string;
        };
        Insert: {
          choice_text: string;
          id?: string;
          is_correct?: boolean;
          letter: Database["public"]["Enums"]["answer_letter"];
          question_id: string;
        };
        Update: {
          choice_text?: string;
          id?: string;
          is_correct?: boolean;
          letter?: Database["public"]["Enums"]["answer_letter"];
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answer_choices_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_logs: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          is_present: boolean | null;
          join_events: Json;
          leave_events: Json;
          manually_overridden: boolean;
          overridden_present: boolean | null;
          override_at: string | null;
          override_by: string | null;
          override_reason: string | null;
          student_id: string;
          total_duration_seconds: number;
          updated_at: string;
          zoom_meeting_id: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          is_present?: boolean | null;
          join_events?: Json;
          leave_events?: Json;
          manually_overridden?: boolean;
          overridden_present?: boolean | null;
          override_at?: string | null;
          override_by?: string | null;
          override_reason?: string | null;
          student_id: string;
          total_duration_seconds?: number;
          updated_at?: string;
          zoom_meeting_id: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          is_present?: boolean | null;
          join_events?: Json;
          leave_events?: Json;
          manually_overridden?: boolean;
          overridden_present?: boolean | null;
          override_at?: string | null;
          override_by?: string | null;
          override_reason?: string | null;
          student_id?: string;
          total_duration_seconds?: number;
          updated_at?: string;
          zoom_meeting_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_logs_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_logs_override_by_fkey";
            columns: ["override_by"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "attendance_logs_override_by_fkey";
            columns: ["override_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "attendance_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          cal_booking_uid: string | null;
          cal_event_type_id: string | null;
          cancellation_email_sent: boolean;
          cancelled_at: string | null;
          cancelled_within_window: boolean | null;
          cohort_id: string | null;
          confirmation_email_sent: boolean;
          created_at: string;
          credit_forfeited: boolean;
          duration_minutes: number | null;
          id: string;
          payout_amount: number | null;
          payout_request_id: string | null;
          payout_status: string;
          plan_tier: string;
          recap_email_sent: boolean;
          recap_resend_message_id: string | null;
          recap_sent_at: string | null;
          reschedule_count: number;
          rescheduled_from: string | null;
          scheduled_end: string;
          scheduled_start: string;
          session_id: string | null;
          status: string;
          status_draft: Json | null;
          status_draft_created_at: string | null;
          status_draft_edited_at: string | null;
          student_id: string;
          transcript: string | null;
          transcript_received_at: string | null;
          transcript_source: string | null;
          tutor_hours: number | null;
          tutor_id: string;
          updated_at: string;
          zoom_join_url: string | null;
          zoom_meeting_id: string | null;
          zoom_start_url: string | null;
        };
        Insert: {
          cal_booking_uid?: string | null;
          cal_event_type_id?: string | null;
          cancellation_email_sent?: boolean;
          cancelled_at?: string | null;
          cancelled_within_window?: boolean | null;
          cohort_id?: string | null;
          confirmation_email_sent?: boolean;
          created_at?: string;
          credit_forfeited?: boolean;
          duration_minutes?: number | null;
          id?: string;
          payout_amount?: number | null;
          payout_request_id?: string | null;
          payout_status?: string;
          plan_tier: string;
          recap_email_sent?: boolean;
          recap_resend_message_id?: string | null;
          recap_sent_at?: string | null;
          reschedule_count?: number;
          rescheduled_from?: string | null;
          scheduled_end: string;
          scheduled_start: string;
          session_id?: string | null;
          status?: string;
          status_draft?: Json | null;
          status_draft_created_at?: string | null;
          status_draft_edited_at?: string | null;
          student_id: string;
          transcript?: string | null;
          transcript_received_at?: string | null;
          transcript_source?: string | null;
          tutor_hours?: number | null;
          tutor_id: string;
          updated_at?: string;
          zoom_join_url?: string | null;
          zoom_meeting_id?: string | null;
          zoom_start_url?: string | null;
        };
        Update: {
          cal_booking_uid?: string | null;
          cal_event_type_id?: string | null;
          cancellation_email_sent?: boolean;
          cancelled_at?: string | null;
          cancelled_within_window?: boolean | null;
          cohort_id?: string | null;
          confirmation_email_sent?: boolean;
          created_at?: string;
          credit_forfeited?: boolean;
          duration_minutes?: number | null;
          id?: string;
          payout_amount?: number | null;
          payout_request_id?: string | null;
          payout_status?: string;
          plan_tier?: string;
          recap_email_sent?: boolean;
          recap_resend_message_id?: string | null;
          recap_sent_at?: string | null;
          reschedule_count?: number;
          rescheduled_from?: string | null;
          scheduled_end?: string;
          scheduled_start?: string;
          session_id?: string | null;
          status?: string;
          status_draft?: Json | null;
          status_draft_created_at?: string | null;
          status_draft_edited_at?: string | null;
          student_id?: string;
          transcript?: string | null;
          transcript_received_at?: string | null;
          transcript_source?: string | null;
          tutor_hours?: number | null;
          tutor_id?: string;
          updated_at?: string;
          zoom_join_url?: string | null;
          zoom_meeting_id?: string | null;
          zoom_start_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "bookings_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "bookings_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "bookings_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_mutes: {
        Row: {
          channel_id: string;
          created_at: string;
          id: string;
          muted_by: string;
          muted_until: string | null;
          reason: string | null;
          student_id: string;
        };
        Insert: {
          channel_id: string;
          created_at?: string;
          id?: string;
          muted_by: string;
          muted_until?: string | null;
          reason?: string | null;
          student_id: string;
        };
        Update: {
          channel_id?: string;
          created_at?: string;
          id?: string;
          muted_by?: string;
          muted_until?: string | null;
          reason?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_mutes_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_mutes_muted_by_fkey";
            columns: ["muted_by"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "channel_mutes_muted_by_fkey";
            columns: ["muted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "channel_mutes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "channel_mutes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_channels: {
        Row: {
          channel_type: string;
          cohort_id: string;
          created_at: string;
          display_name: string;
          id: string;
          slack_channel_id: string;
        };
        Insert: {
          channel_type: string;
          cohort_id: string;
          created_at?: string;
          display_name: string;
          id?: string;
          slack_channel_id: string;
        };
        Update: {
          channel_type?: string;
          cohort_id?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          slack_channel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_channels_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "chat_channels_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          ai_flag_reason: string | null;
          ai_flagged: boolean;
          channel_id: string;
          client_msg_id: string | null;
          cohort_label: string | null;
          content: string | null;
          created_at: string;
          display_name_override: string | null;
          human_review_action: string | null;
          human_reviewed: boolean;
          human_reviewed_at: string | null;
          human_reviewed_by: string | null;
          id: string;
          is_anonymous: boolean;
          is_highlighted: boolean;
          is_pinned: boolean;
          keyword_flagged: boolean;
          media_urls: string[];
          message_type: string;
          moderation_status: string;
          parent_message_id: string | null;
          rejection_message: string | null;
          sender_id: string;
          slack_message_ts: string;
          updated_at: string;
        };
        Insert: {
          ai_flag_reason?: string | null;
          ai_flagged?: boolean;
          channel_id: string;
          client_msg_id?: string | null;
          cohort_label?: string | null;
          content?: string | null;
          created_at?: string;
          display_name_override?: string | null;
          human_review_action?: string | null;
          human_reviewed?: boolean;
          human_reviewed_at?: string | null;
          human_reviewed_by?: string | null;
          id?: string;
          is_anonymous?: boolean;
          is_highlighted?: boolean;
          is_pinned?: boolean;
          keyword_flagged?: boolean;
          media_urls?: string[];
          message_type: string;
          moderation_status?: string;
          parent_message_id?: string | null;
          rejection_message?: string | null;
          sender_id: string;
          slack_message_ts: string;
          updated_at?: string;
        };
        Update: {
          ai_flag_reason?: string | null;
          ai_flagged?: boolean;
          channel_id?: string;
          client_msg_id?: string | null;
          cohort_label?: string | null;
          content?: string | null;
          created_at?: string;
          display_name_override?: string | null;
          human_review_action?: string | null;
          human_reviewed?: boolean;
          human_reviewed_at?: string | null;
          human_reviewed_by?: string | null;
          id?: string;
          is_anonymous?: boolean;
          is_highlighted?: boolean;
          is_pinned?: boolean;
          keyword_flagged?: boolean;
          media_urls?: string[];
          message_type?: string;
          moderation_status?: string;
          parent_message_id?: string | null;
          rejection_message?: string | null;
          sender_id?: string;
          slack_message_ts?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_human_reviewed_by_fkey";
            columns: ["human_reviewed_by"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "chat_messages_human_reviewed_by_fkey";
            columns: ["human_reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey";
            columns: ["parent_message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cohort_homework: {
        Row: {
          assigned_at: string;
          body: string | null;
          cohort_id: string;
          created_at: string;
          created_by_user_id: string;
          due_at: string | null;
          id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string;
          body?: string | null;
          cohort_id: string;
          created_at?: string;
          created_by_user_id: string;
          due_at?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string;
          body?: string | null;
          cohort_id?: string;
          created_at?: string;
          created_by_user_id?: string;
          due_at?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohort_homework_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "cohort_homework_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohort_homework_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "cohort_homework_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cohort_members: {
        Row: {
          cohort_id: string;
          joined_at: string;
          left_at: string | null;
          user_id: string;
        };
        Insert: {
          cohort_id: string;
          joined_at?: string;
          left_at?: string | null;
          user_id: string;
        };
        Update: {
          cohort_id?: string;
          joined_at?: string;
          left_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "cohort_members_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cohort_waitlist: {
        Row: {
          created_at: string;
          fulfilled_at: string | null;
          target_sat_date: string;
          target_tier: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          fulfilled_at?: string | null;
          target_sat_date: string;
          target_tier?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          fulfilled_at?: string | null;
          target_sat_date?: string;
          target_tier?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohort_waitlist_target_sat_date_fkey";
            columns: ["target_sat_date"];
            isOneToOne: false;
            referencedRelation: "sat_dates";
            referencedColumns: ["test_date"];
          },
          {
            foreignKeyName: "cohort_waitlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "cohort_waitlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cohorts: {
        Row: {
          archived_at: string | null;
          created_at: string;
          current_topic: string | null;
          ended_at: string | null;
          id: string;
          max_size: number;
          name: string;
          sat_date: string;
          setup_completed_at: string | null;
          status: string;
          tier: string;
          tutor_user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          current_topic?: string | null;
          ended_at?: string | null;
          id?: string;
          max_size: number;
          name: string;
          sat_date: string;
          setup_completed_at?: string | null;
          status?: string;
          tier: string;
          tutor_user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          current_topic?: string | null;
          ended_at?: string | null;
          id?: string;
          max_size?: number;
          name?: string;
          sat_date?: string;
          setup_completed_at?: string | null;
          status?: string;
          tier?: string;
          tutor_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohorts_sat_date_fkey";
            columns: ["sat_date"];
            isOneToOne: false;
            referencedRelation: "sat_dates";
            referencedColumns: ["test_date"];
          },
          {
            foreignKeyName: "cohorts_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "cohorts_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      concepts: {
        Row: {
          difficulty: number;
          domain: string;
          id: string;
          node_position_x: number;
          node_position_y: number;
          prerequisite_ids: string[];
          title: string;
        };
        Insert: {
          difficulty: number;
          domain: string;
          id?: string;
          node_position_x?: number;
          node_position_y?: number;
          prerequisite_ids?: string[];
          title: string;
        };
        Update: {
          difficulty?: number;
          domain?: string;
          id?: string;
          node_position_x?: number;
          node_position_y?: number;
          prerequisite_ids?: string[];
          title?: string;
        };
        Relationships: [];
      };
      diagnostic_results: {
        Row: {
          domain_scores: Json;
          id: string;
          score_range_high: number;
          score_range_low: number;
          taken_at: string;
          user_id: string;
          weak_concepts: string[];
        };
        Insert: {
          domain_scores?: Json;
          id?: string;
          score_range_high: number;
          score_range_low: number;
          taken_at?: string;
          user_id: string;
          weak_concepts?: string[];
        };
        Update: {
          domain_scores?: Json;
          id?: string;
          score_range_high?: number;
          score_range_low?: number;
          taken_at?: string;
          user_id?: string;
          weak_concepts?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "diagnostic_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "diagnostic_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      direct_messages: {
        Row: {
          ai_flag_reason: string | null;
          ai_flagged: boolean;
          client_msg_id: string | null;
          cohort_id: string;
          content: string | null;
          created_at: string;
          human_review_action: string | null;
          human_reviewed: boolean;
          human_reviewed_at: string | null;
          human_reviewed_by: string | null;
          id: string;
          keyword_flagged: boolean;
          media_urls: string[];
          moderation_status: string;
          read_at: string | null;
          recipient_id: string;
          rejection_message: string | null;
          sender_id: string;
          slack_dm_channel_id: string | null;
          slack_message_ts: string | null;
        };
        Insert: {
          ai_flag_reason?: string | null;
          ai_flagged?: boolean;
          client_msg_id?: string | null;
          cohort_id: string;
          content?: string | null;
          created_at?: string;
          human_review_action?: string | null;
          human_reviewed?: boolean;
          human_reviewed_at?: string | null;
          human_reviewed_by?: string | null;
          id?: string;
          keyword_flagged?: boolean;
          media_urls?: string[];
          moderation_status?: string;
          read_at?: string | null;
          recipient_id: string;
          rejection_message?: string | null;
          sender_id: string;
          slack_dm_channel_id?: string | null;
          slack_message_ts?: string | null;
        };
        Update: {
          ai_flag_reason?: string | null;
          ai_flagged?: boolean;
          client_msg_id?: string | null;
          cohort_id?: string;
          content?: string | null;
          created_at?: string;
          human_review_action?: string | null;
          human_reviewed?: boolean;
          human_reviewed_at?: string | null;
          human_reviewed_by?: string | null;
          id?: string;
          keyword_flagged?: boolean;
          media_urls?: string[];
          moderation_status?: string;
          read_at?: string | null;
          recipient_id?: string;
          rejection_message?: string | null;
          sender_id?: string;
          slack_dm_channel_id?: string | null;
          slack_message_ts?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "direct_messages_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "direct_messages_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_human_reviewed_by_fkey";
            columns: ["human_reviewed_by"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "direct_messages_human_reviewed_by_fkey";
            columns: ["human_reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "direct_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      failed_emails: {
        Row: {
          attempts: number;
          booking_id: string | null;
          created_at: string;
          dedupe_key: string;
          given_up_at: string | null;
          id: string;
          kind: string;
          last_attempt_at: string;
          last_error: string | null;
          next_attempt_at: string;
          payload: Json;
          succeeded_at: string | null;
        };
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          created_at?: string;
          dedupe_key: string;
          given_up_at?: string | null;
          id?: string;
          kind: string;
          last_attempt_at?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload: Json;
          succeeded_at?: string | null;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          created_at?: string;
          dedupe_key?: string;
          given_up_at?: string | null;
          id?: string;
          kind?: string;
          last_attempt_at?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload?: Json;
          succeeded_at?: string | null;
        };
        Relationships: [];
      };
      flagged_questions: {
        Row: {
          created_at: string | null;
          flag_note: string | null;
          id: string;
          node_id: string;
          question_id: string;
          resolved: boolean | null;
          resolved_at: string | null;
          resolved_by: string | null;
          student_id: string;
        };
        Insert: {
          created_at?: string | null;
          flag_note?: string | null;
          id?: string;
          node_id: string;
          question_id: string;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          student_id: string;
        };
        Update: {
          created_at?: string | null;
          flag_note?: string | null;
          id?: string;
          node_id?: string;
          question_id?: string;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flagged_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      learn_checkpoint_attempts: {
        Row: {
          attempted_at: string | null;
          id: string;
          passed: boolean;
          score: number;
          subject: string;
          tier: number;
          user_id: string;
        };
        Insert: {
          attempted_at?: string | null;
          id?: string;
          passed?: boolean;
          score: number;
          subject: string;
          tier: number;
          user_id: string;
        };
        Update: {
          attempted_at?: string | null;
          id?: string;
          passed?: boolean;
          score?: number;
          subject?: string;
          tier?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      learn_node_status: {
        Row: {
          attempts: number | null;
          best_quiz_score: number | null;
          completed_at: string | null;
          confidence_band: string | null;
          consecutive_passes: number | null;
          id: string;
          last_quiz_score: number | null;
          node_id: string;
          score: number | null;
          status: string;
          updated_at: string | null;
          user_id: string;
          watch_percentage: number | null;
        };
        Insert: {
          attempts?: number | null;
          best_quiz_score?: number | null;
          completed_at?: string | null;
          confidence_band?: string | null;
          consecutive_passes?: number | null;
          id?: string;
          last_quiz_score?: number | null;
          node_id: string;
          score?: number | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
          watch_percentage?: number | null;
        };
        Update: {
          attempts?: number | null;
          best_quiz_score?: number | null;
          completed_at?: string | null;
          confidence_band?: string | null;
          consecutive_passes?: number | null;
          id?: string;
          last_quiz_score?: number | null;
          node_id?: string;
          score?: number | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
          watch_percentage?: number | null;
        };
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          action_type: string;
          admin_id: string;
          channel_id: string | null;
          created_at: string;
          dm_id: string | null;
          duration_minutes: number | null;
          id: string;
          message_id: string | null;
          reason: string | null;
          severity: string | null;
          target_student_id: string;
        };
        Insert: {
          action_type: string;
          admin_id: string;
          channel_id?: string | null;
          created_at?: string;
          dm_id?: string | null;
          duration_minutes?: number | null;
          id?: string;
          message_id?: string | null;
          reason?: string | null;
          severity?: string | null;
          target_student_id: string;
        };
        Update: {
          action_type?: string;
          admin_id?: string;
          channel_id?: string | null;
          created_at?: string;
          dm_id?: string | null;
          duration_minutes?: number | null;
          id?: string;
          message_id?: string | null;
          reason?: string | null;
          severity?: string | null;
          target_student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "moderation_actions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_dm_id_fkey";
            columns: ["dm_id"];
            isOneToOne: false;
            referencedRelation: "direct_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_target_student_id_fkey";
            columns: ["target_student_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "moderation_actions_target_student_id_fkey";
            columns: ["target_student_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      node_content: {
        Row: {
          node_id: string;
          textbook_content: string | null;
          updated_at: string | null;
          updated_by: string | null;
          video_duration_seconds: number | null;
          video_storage_path: string | null;
          video_url: string | null;
        };
        Insert: {
          node_id: string;
          textbook_content?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          video_duration_seconds?: number | null;
          video_storage_path?: string | null;
          video_url?: string | null;
        };
        Update: {
          node_id?: string;
          textbook_content?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          video_duration_seconds?: number | null;
          video_storage_path?: string | null;
          video_url?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string | null;
          id: string;
          link: string | null;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string | null;
          id?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string | null;
          id?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_student_links: {
        Row: {
          created_at: string;
          parent_user_id: string;
          student_user_id: string;
        };
        Insert: {
          created_at?: string;
          parent_user_id: string;
          student_user_id: string;
        };
        Update: {
          created_at?: string;
          parent_user_id?: string;
          student_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_user_id_fkey";
            columns: ["parent_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "parent_student_links_parent_user_id_fkey";
            columns: ["parent_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_student_links_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "parent_student_links_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_requests: {
        Row: {
          application_fee_amount: number | null;
          approved_at: string | null;
          approved_by_user_id: string | null;
          booking_count: number | null;
          booking_ids: string[];
          cancelled_at: string | null;
          created_at: string | null;
          id: string;
          net_amount: number | null;
          notes: string | null;
          paid_at: string | null;
          payment_method: string;
          payout_method: string | null;
          requested_at: string | null;
          session_ids: string[] | null;
          status: string;
          stripe_payout_id: string | null;
          stripe_transfer_id: string | null;
          total_amount: number;
          total_hours: number;
          tutor_user_id: string;
          updated_at: string | null;
          zelle_recipient_email: string | null;
          zelle_recipient_phone: string | null;
        };
        Insert: {
          application_fee_amount?: number | null;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          booking_count?: number | null;
          booking_ids: string[];
          cancelled_at?: string | null;
          created_at?: string | null;
          id?: string;
          net_amount?: number | null;
          notes?: string | null;
          paid_at?: string | null;
          payment_method?: string;
          payout_method?: string | null;
          requested_at?: string | null;
          session_ids?: string[] | null;
          status?: string;
          stripe_payout_id?: string | null;
          stripe_transfer_id?: string | null;
          total_amount: number;
          total_hours: number;
          tutor_user_id: string;
          updated_at?: string | null;
          zelle_recipient_email?: string | null;
          zelle_recipient_phone?: string | null;
        };
        Update: {
          application_fee_amount?: number | null;
          approved_at?: string | null;
          approved_by_user_id?: string | null;
          booking_count?: number | null;
          booking_ids?: string[];
          cancelled_at?: string | null;
          created_at?: string | null;
          id?: string;
          net_amount?: number | null;
          notes?: string | null;
          paid_at?: string | null;
          payment_method?: string;
          payout_method?: string | null;
          requested_at?: string | null;
          session_ids?: string[] | null;
          status?: string;
          stripe_payout_id?: string | null;
          stripe_transfer_id?: string | null;
          total_amount?: number;
          total_hours?: number;
          tutor_user_id?: string;
          updated_at?: string | null;
          zelle_recipient_email?: string | null;
          zelle_recipient_phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payout_requests_approved_by_user_id_fkey";
            columns: ["approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "payout_requests_approved_by_user_id_fkey";
            columns: ["approved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_requests_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "payout_requests_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pdf_processing_jobs: {
        Row: {
          completed_at: string | null;
          csv_storage_paths: Json;
          error_message: string | null;
          id: string;
          imported_counts: Json;
          module_status: Json;
          pdf_page_count: number | null;
          pdf_size_bytes: number | null;
          pdf_storage_path: string;
          progress: Json;
          source_pdf: string;
          started_at: string | null;
          status: string;
          uploaded_at: string;
          uploaded_by_user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          csv_storage_paths?: Json;
          error_message?: string | null;
          id?: string;
          imported_counts?: Json;
          module_status?: Json;
          pdf_page_count?: number | null;
          pdf_size_bytes?: number | null;
          pdf_storage_path: string;
          progress?: Json;
          source_pdf: string;
          started_at?: string | null;
          status?: string;
          uploaded_at?: string;
          uploaded_by_user_id: string;
        };
        Update: {
          completed_at?: string | null;
          csv_storage_paths?: Json;
          error_message?: string | null;
          id?: string;
          imported_counts?: Json;
          module_status?: Json;
          pdf_page_count?: number | null;
          pdf_size_bytes?: number | null;
          pdf_storage_path?: string;
          progress?: Json;
          source_pdf?: string;
          started_at?: string | null;
          status?: string;
          uploaded_at?: string;
          uploaded_by_user_id?: string;
        };
        Relationships: [];
      };
      progress: {
        Row: {
          concept_id: string;
          id: string;
          last_visited: string | null;
          quiz_score: number | null;
          status: string;
          user_id: string;
        };
        Insert: {
          concept_id: string;
          id?: string;
          last_visited?: string | null;
          quiz_score?: number | null;
          status?: string;
          user_id: string;
        };
        Update: {
          concept_id?: string;
          id?: string;
          last_visited?: string | null;
          quiz_score?: number | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "progress_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      question_responses: {
        Row: {
          answered_at: string | null;
          attempt_id: string;
          difficulty_at_time: Database["public"]["Enums"]["question_difficulty"];
          flag_note: string | null;
          flagged: boolean | null;
          id: string;
          is_correct: boolean;
          question_id: string;
          response_time_seconds: number | null;
          student_answer: string;
        };
        Insert: {
          answered_at?: string | null;
          attempt_id: string;
          difficulty_at_time: Database["public"]["Enums"]["question_difficulty"];
          flag_note?: string | null;
          flagged?: boolean | null;
          id?: string;
          is_correct: boolean;
          question_id: string;
          response_time_seconds?: number | null;
          student_answer: string;
        };
        Update: {
          answered_at?: string | null;
          attempt_id?: string;
          difficulty_at_time?: Database["public"]["Enums"]["question_difficulty"];
          flag_note?: string | null;
          flagged?: boolean | null;
          id?: string;
          is_correct?: boolean;
          question_id?: string;
          response_time_seconds?: number | null;
          student_answer?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_responses_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          concept_id: string | null;
          correct_answer: string;
          difficulty: number;
          domain: string;
          id: string;
          options: string[];
          question_text: string;
        };
        Insert: {
          concept_id?: string | null;
          correct_answer: string;
          difficulty: number;
          domain: string;
          id?: string;
          options: string[];
          question_text: string;
        };
        Update: {
          concept_id?: string | null;
          correct_answer?: string;
          difficulty?: number;
          domain?: string;
          id?: string;
          options?: string[];
          question_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          adaptive_path: Json | null;
          attempt_number: number;
          completed_at: string | null;
          confidence_band: Database["public"]["Enums"]["confidence_band"] | null;
          id: string;
          node_id: string;
          questions_answered: number | null;
          questions_correct: number | null;
          score: number | null;
          started_at: string | null;
          student_id: string;
        };
        Insert: {
          adaptive_path?: Json | null;
          attempt_number?: number;
          completed_at?: string | null;
          confidence_band?: Database["public"]["Enums"]["confidence_band"] | null;
          id?: string;
          node_id: string;
          questions_answered?: number | null;
          questions_correct?: number | null;
          score?: number | null;
          started_at?: string | null;
          student_id: string;
        };
        Update: {
          adaptive_path?: Json | null;
          attempt_number?: number;
          completed_at?: string | null;
          confidence_band?: Database["public"]["Enums"]["confidence_band"] | null;
          id?: string;
          node_id?: string;
          questions_answered?: number | null;
          questions_correct?: number | null;
          score?: number | null;
          started_at?: string | null;
          student_id?: string;
        };
        Relationships: [];
      };
      question_history: {
        Row: {
          id: string;
          question_id: string;
          before_state: Json;
          after_state: Json;
          changed_fields: string[];
          edited_by: string;
          edit_source: "inspector" | "bulk" | "api" | "apply-fix" | "preview";
          edit_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          before_state: Json;
          after_state: Json;
          changed_fields?: string[];
          edited_by: string;
          edit_source: "inspector" | "bulk" | "api" | "apply-fix" | "preview";
          edit_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          before_state?: Json;
          after_state?: Json;
          changed_fields?: string[];
          edited_by?: string;
          edit_source?: "inspector" | "bulk" | "api" | "apply-fix" | "preview";
          edit_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_history_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      question_findings: {
        Row: {
          id: string;
          question_id: string;
          source: "auditor" | "grader";
          severity: "BLOCKING" | "WARNING" | "NOTICE";
          category: string;
          code: string;
          message: string;
          value: string | null;
          detail: Json | null;
          resolved_at: string | null;
          resolved_by: string | null;
          resolved_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          source: "auditor" | "grader";
          severity: "BLOCKING" | "WARNING" | "NOTICE";
          category: string;
          code: string;
          message: string;
          value?: string | null;
          detail?: Json | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolved_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          source?: "auditor" | "grader";
          severity?: "BLOCKING" | "WARNING" | "NOTICE";
          category?: string;
          code?: string;
          message?: string;
          value?: string | null;
          detail?: Json | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolved_note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_findings_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          answer_format: Database["public"]["Enums"]["question_format"];
          answer_source: string | null;
          concept_slug: string | null;
          content_hash: string | null;
          correct_answer: string;
          created_at: string | null;
          desmos_strategy: string | null;
          difficulty: Database["public"]["Enums"]["question_difficulty"];
          difficulty_level: number;
          display_order: number | null;
          domain: string | null;
          explanation_per_choice: Json | null;
          explanation_text: string;
          flag_count: number | null;
          hint: string | null;
          id: string;
          image_alt: string | null;
          image_storage_path: string | null;
          image_url: string | null;
          figure_kind: "image" | "table" | "chart" | "svg" | null;
          figure_table_data: Json | null;
          figure_chart_data: Json | null;
          import_flag_reason: string | null;
          import_flag_type: string | null;
          import_status: string | null;
          is_flagged: boolean | null;
          is_live: boolean | null;
          node_id: string | null;
          numeric_tolerance: number | null;
          passage: string | null;
          passage_a: string | null;
          passage_b: string | null;
          passage_intro: string | null;
          question_text: string;
          question_type: Database["public"]["Enums"]["question_type"];
          source_page: number | null;
          source_pdf: string | null;
          subject: Database["public"]["Enums"]["quiz_subject"];
          topic_cluster: string;
          updated_at: string | null;
        };
        Insert: {
          answer_format?: Database["public"]["Enums"]["question_format"];
          answer_source?: string | null;
          concept_slug?: string | null;
          content_hash?: string | null;
          correct_answer: string;
          created_at?: string | null;
          desmos_strategy?: string | null;
          difficulty: Database["public"]["Enums"]["question_difficulty"];
          difficulty_level?: number;
          display_order?: number | null;
          domain?: string | null;
          explanation_per_choice?: Json | null;
          explanation_text: string;
          flag_count?: number | null;
          hint?: string | null;
          id?: string;
          image_alt?: string | null;
          image_storage_path?: string | null;
          image_url?: string | null;
          figure_kind?: "image" | "table" | "chart" | "svg" | null;
          figure_table_data?: Json | null;
          figure_chart_data?: Json | null;
          import_flag_reason?: string | null;
          import_flag_type?: string | null;
          import_status?: string | null;
          is_flagged?: boolean | null;
          node_id?: string | null;
          numeric_tolerance?: number | null;
          passage?: string | null;
          passage_a?: string | null;
          passage_b?: string | null;
          passage_intro?: string | null;
          question_text: string;
          question_type: Database["public"]["Enums"]["question_type"];
          source_page?: number | null;
          source_pdf?: string | null;
          subject: Database["public"]["Enums"]["quiz_subject"];
          topic_cluster: string;
          updated_at?: string | null;
        };
        Update: {
          answer_format?: Database["public"]["Enums"]["question_format"];
          answer_source?: string | null;
          concept_slug?: string | null;
          content_hash?: string | null;
          correct_answer?: string;
          created_at?: string | null;
          desmos_strategy?: string | null;
          difficulty?: Database["public"]["Enums"]["question_difficulty"];
          difficulty_level?: number;
          display_order?: number | null;
          domain?: string | null;
          explanation_per_choice?: Json | null;
          explanation_text?: string;
          flag_count?: number | null;
          hint?: string | null;
          id?: string;
          image_alt?: string | null;
          image_storage_path?: string | null;
          image_url?: string | null;
          figure_kind?: "image" | "table" | "chart" | "svg" | null;
          figure_table_data?: Json | null;
          figure_chart_data?: Json | null;
          import_flag_reason?: string | null;
          import_flag_type?: string | null;
          import_status?: string | null;
          is_flagged?: boolean | null;
          node_id?: string | null;
          numeric_tolerance?: number | null;
          passage?: string | null;
          passage_a?: string | null;
          passage_b?: string | null;
          passage_intro?: string | null;
          question_text?: string;
          question_type?: Database["public"]["Enums"]["question_type"];
          source_page?: number | null;
          source_pdf?: string | null;
          subject?: Database["public"]["Enums"]["quiz_subject"];
          topic_cluster?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          amount_cents: number;
          id: string;
          issued_at: string;
          reason: string | null;
          stripe_refund_id: string | null;
          subscription_id: string | null;
          user_id: string | null;
        };
        Insert: {
          amount_cents: number;
          id?: string;
          issued_at?: string;
          reason?: string | null;
          stripe_refund_id?: string | null;
          subscription_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          id?: string;
          issued_at?: string;
          reason?: string | null;
          stripe_refund_id?: string | null;
          subscription_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "refunds_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      revenue_snapshots: {
        Row: {
          active_students: number;
          by_tier: Json;
          captured_at: string;
          id: string;
          mrr_cents: number;
        };
        Insert: {
          active_students: number;
          by_tier?: Json;
          captured_at?: string;
          id?: string;
          mrr_cents: number;
        };
        Update: {
          active_students?: number;
          by_tier?: Json;
          captured_at?: string;
          id?: string;
          mrr_cents?: number;
        };
        Relationships: [];
      };
      sat_dates: {
        Row: {
          imported_at: string;
          late_registration_deadline: string | null;
          registration_deadline: string | null;
          source_url: string | null;
          test_date: string;
        };
        Insert: {
          imported_at?: string;
          late_registration_deadline?: string | null;
          registration_deadline?: string | null;
          source_url?: string | null;
          test_date: string;
        };
        Update: {
          imported_at?: string;
          late_registration_deadline?: string | null;
          registration_deadline?: string | null;
          source_url?: string | null;
          test_date?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          cohort_id: string | null;
          created_at: string | null;
          duration_minutes: number | null;
          id: string;
          payout_amount: number | null;
          payout_request_id: string | null;
          payout_status: string;
          recap_email_sent: boolean;
          recap_resend_message_ids: string[] | null;
          recap_sent_at: string | null;
          scheduled_end: string;
          scheduled_start: string;
          status: string;
          status_draft: Json | null;
          status_draft_created_at: string | null;
          status_draft_edited_at: string | null;
          transcript: string | null;
          transcript_received_at: string | null;
          transcript_source: string | null;
          tutor_hours: number | null;
          tutor_id: string;
          updated_at: string | null;
          zoom_attended_at: string | null;
          zoom_attended_emails: string[] | null;
          zoom_join_url: string | null;
          zoom_meeting_id: string | null;
          zoom_recording_url: string | null;
        };
        Insert: {
          cohort_id?: string | null;
          created_at?: string | null;
          duration_minutes?: number | null;
          id?: string;
          payout_amount?: number | null;
          payout_request_id?: string | null;
          payout_status?: string;
          recap_email_sent?: boolean;
          recap_resend_message_ids?: string[] | null;
          recap_sent_at?: string | null;
          scheduled_end: string;
          scheduled_start: string;
          status?: string;
          status_draft?: Json | null;
          status_draft_created_at?: string | null;
          status_draft_edited_at?: string | null;
          transcript?: string | null;
          transcript_received_at?: string | null;
          transcript_source?: string | null;
          tutor_hours?: number | null;
          tutor_id: string;
          updated_at?: string | null;
          zoom_attended_at?: string | null;
          zoom_attended_emails?: string[] | null;
          zoom_join_url?: string | null;
          zoom_meeting_id?: string | null;
          zoom_recording_url?: string | null;
        };
        Update: {
          cohort_id?: string | null;
          created_at?: string | null;
          duration_minutes?: number | null;
          id?: string;
          payout_amount?: number | null;
          payout_request_id?: string | null;
          payout_status?: string;
          recap_email_sent?: boolean;
          recap_resend_message_ids?: string[] | null;
          recap_sent_at?: string | null;
          scheduled_end?: string;
          scheduled_start?: string;
          status?: string;
          status_draft?: Json | null;
          status_draft_created_at?: string | null;
          status_draft_edited_at?: string | null;
          transcript?: string | null;
          transcript_received_at?: string | null;
          transcript_source?: string | null;
          tutor_hours?: number | null;
          tutor_id?: string;
          updated_at?: string | null;
          zoom_attended_at?: string | null;
          zoom_attended_emails?: string[] | null;
          zoom_join_url?: string | null;
          zoom_meeting_id?: string | null;
          zoom_recording_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "sessions_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "sessions_tutor_id_fkey";
            columns: ["tutor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      status_email_log: {
        Row: {
          booking_id: string;
          channels_used: string[];
          error_message: string | null;
          id: string;
          recipient_emails: string[] | null;
          resend_message_id: string | null;
          sent_at: string | null;
          status: string;
          student_user_id: string;
          tutor_user_id: string;
        };
        Insert: {
          booking_id: string;
          channels_used?: string[];
          error_message?: string | null;
          id?: string;
          recipient_emails?: string[] | null;
          resend_message_id?: string | null;
          sent_at?: string | null;
          status: string;
          student_user_id: string;
          tutor_user_id: string;
        };
        Update: {
          booking_id?: string;
          channels_used?: string[];
          error_message?: string | null;
          id?: string;
          recipient_emails?: string[] | null;
          resend_message_id?: string | null;
          sent_at?: string | null;
          status?: string;
          student_user_id?: string;
          tutor_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "status_email_log_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "status_email_log_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "status_email_log_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "status_email_log_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "status_email_log_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          canceled_at: string | null;
          created_at: string;
          id: string;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          tier: string;
          trial_end: string | null;
          user_id: string;
        };
        Insert: {
          canceled_at?: string | null;
          created_at?: string;
          id?: string;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          tier: string;
          trial_end?: string | null;
          user_id: string;
        };
        Update: {
          canceled_at?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          tier?: string;
          trial_end?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      tokens: {
        Row: {
          assigned_booking_id: string | null;
          consumed_at: string | null;
          consumed_reason: string | null;
          created_at: string;
          expires_at: string | null;
          granted_at: string;
          granted_for_month: string | null;
          id: string;
          source: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_booking_id?: string | null;
          consumed_at?: string | null;
          consumed_reason?: string | null;
          created_at?: string;
          expires_at?: string | null;
          granted_at?: string;
          granted_for_month?: string | null;
          id?: string;
          source: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_booking_id?: string | null;
          consumed_at?: string | null;
          consumed_reason?: string | null;
          created_at?: string;
          expires_at?: string | null;
          granted_at?: string;
          granted_for_month?: string | null;
          id?: string;
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tokens_assigned_booking_id_fkey";
            columns: ["assigned_booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_assignments: {
        Row: {
          ended_at: string | null;
          id: string;
          started_at: string;
          student_user_id: string;
          tutor_user_id: string;
        };
        Insert: {
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          student_user_id: string;
          tutor_user_id: string;
        };
        Update: {
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          student_user_id?: string;
          tutor_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_assignments_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "tutor_assignments_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_assignments_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "tutor_assignments_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tutor_checkpoint_assignments: {
        Row: {
          assigned_at: string | null;
          checkpoint_id: string;
          cooldown_override: boolean | null;
          id: string;
          reason: string | null;
          student_id: string;
          tutor_id: string;
        };
        Insert: {
          assigned_at?: string | null;
          checkpoint_id: string;
          cooldown_override?: boolean | null;
          id?: string;
          reason?: string | null;
          student_id: string;
          tutor_id: string;
        };
        Update: {
          assigned_at?: string | null;
          checkpoint_id?: string;
          cooldown_override?: boolean | null;
          id?: string;
          reason?: string | null;
          student_id?: string;
          tutor_id?: string;
        };
        Relationships: [];
      };
      tutor_node_overrides: {
        Row: {
          created_at: string | null;
          id: string;
          locked_pathway: boolean | null;
          node_id: string;
          override_status: Database["public"]["Enums"]["override_status"];
          reason: string | null;
          student_id: string;
          tutor_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          locked_pathway?: boolean | null;
          node_id: string;
          override_status: Database["public"]["Enums"]["override_status"];
          reason?: string | null;
          student_id: string;
          tutor_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          locked_pathway?: boolean | null;
          node_id?: string;
          override_status?: Database["public"]["Enums"]["override_status"];
          reason?: string | null;
          student_id?: string;
          tutor_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tutor_notes: {
        Row: {
          body: string;
          cohort_id: string | null;
          created_at: string;
          id: string;
          student_user_id: string | null;
          tutor_user_id: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          cohort_id?: string | null;
          created_at?: string;
          id?: string;
          student_user_id?: string | null;
          tutor_user_id: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          cohort_id?: string | null;
          created_at?: string;
          id?: string;
          student_user_id?: string | null;
          tutor_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_notes_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "active_cohort_for_student";
            referencedColumns: ["cohort_id"];
          },
          {
            foreignKeyName: "tutor_notes_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_notes_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "tutor_notes_student_user_id_fkey";
            columns: ["student_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_notes_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "tutor_notes_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          available_days: string[] | null;
          available_times: string[] | null;
          avatar_url: string | null;
          bank_name: string | null;
          booking_lock_until: string | null;
          cal_connected_at: string | null;
          cal_event_type_id: number | null;
          cal_event_type_title: string | null;
          cal_oauth_access_token: string | null;
          cal_oauth_expires_at: string | null;
          cal_oauth_refresh_token: string | null;
          cal_setup_alerted_at: string | null;
          clerk_id: string;
          created_at: string;
          diagnostic_retakes_remaining: number;
          email: string;
          email_signature: string | null;
          first_name: string | null;
          goal_sat_score: number | null;
          heard_about_karman: string | null;
          hourly_rate: number | null;
          hs_year: string | null;
          id: string;
          last_name: string | null;
          onboarding_completed_at: string | null;
          parent_email_collected: string | null;
          parent_phone_collected: string | null;
          payment_info_updated_at: string | null;
          payment_method: string | null;
          placement_failure_at: string | null;
          psat_score: number | null;
          recent_sat_math: number | null;
          recent_sat_reading: number | null;
          recent_sat_time_pressure: boolean | null;
          role: string;
          sat_test_date: string | null;
          signup_ip: string | null;
          stripe_connect_account_id: string | null;
          stripe_connect_onboarded_at: string | null;
          stripe_payouts_enabled: boolean | null;
          time_zone: string | null;
          zelle_email: string | null;
          zelle_phone: string | null;
        };
        Insert: {
          available_days?: string[] | null;
          available_times?: string[] | null;
          avatar_url?: string | null;
          bank_name?: string | null;
          booking_lock_until?: string | null;
          cal_connected_at?: string | null;
          cal_event_type_id?: number | null;
          cal_event_type_title?: string | null;
          cal_oauth_access_token?: string | null;
          cal_oauth_expires_at?: string | null;
          cal_oauth_refresh_token?: string | null;
          cal_setup_alerted_at?: string | null;
          clerk_id: string;
          created_at?: string;
          diagnostic_retakes_remaining?: number;
          email: string;
          email_signature?: string | null;
          first_name?: string | null;
          goal_sat_score?: number | null;
          heard_about_karman?: string | null;
          hourly_rate?: number | null;
          hs_year?: string | null;
          id?: string;
          last_name?: string | null;
          onboarding_completed_at?: string | null;
          parent_email_collected?: string | null;
          parent_phone_collected?: string | null;
          payment_info_updated_at?: string | null;
          payment_method?: string | null;
          placement_failure_at?: string | null;
          psat_score?: number | null;
          recent_sat_math?: number | null;
          recent_sat_reading?: number | null;
          recent_sat_time_pressure?: boolean | null;
          role?: string;
          sat_test_date?: string | null;
          signup_ip?: string | null;
          stripe_connect_account_id?: string | null;
          stripe_connect_onboarded_at?: string | null;
          stripe_payouts_enabled?: boolean | null;
          time_zone?: string | null;
          zelle_email?: string | null;
          zelle_phone?: string | null;
        };
        Update: {
          available_days?: string[] | null;
          available_times?: string[] | null;
          avatar_url?: string | null;
          bank_name?: string | null;
          booking_lock_until?: string | null;
          cal_connected_at?: string | null;
          cal_event_type_id?: number | null;
          cal_event_type_title?: string | null;
          cal_oauth_access_token?: string | null;
          cal_oauth_expires_at?: string | null;
          cal_oauth_refresh_token?: string | null;
          cal_setup_alerted_at?: string | null;
          clerk_id?: string;
          created_at?: string;
          diagnostic_retakes_remaining?: number;
          email?: string;
          email_signature?: string | null;
          first_name?: string | null;
          goal_sat_score?: number | null;
          heard_about_karman?: string | null;
          hourly_rate?: number | null;
          hs_year?: string | null;
          id?: string;
          last_name?: string | null;
          onboarding_completed_at?: string | null;
          parent_email_collected?: string | null;
          parent_phone_collected?: string | null;
          payment_info_updated_at?: string | null;
          payment_method?: string | null;
          placement_failure_at?: string | null;
          psat_score?: number | null;
          recent_sat_math?: number | null;
          recent_sat_reading?: number | null;
          recent_sat_time_pressure?: boolean | null;
          role?: string;
          sat_test_date?: string | null;
          signup_ip?: string | null;
          stripe_connect_account_id?: string | null;
          stripe_connect_onboarded_at?: string | null;
          stripe_payouts_enabled?: boolean | null;
          time_zone?: string | null;
          zelle_email?: string | null;
          zelle_phone?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          attempts: number;
          booking_id: string | null;
          error_message: string | null;
          event_type: string | null;
          external_event_id: string | null;
          gave_up_at: string | null;
          id: string;
          processed: boolean;
          processed_at: string | null;
          raw_payload: Json;
          received_at: string | null;
          source: string;
        };
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          error_message?: string | null;
          event_type?: string | null;
          external_event_id?: string | null;
          gave_up_at?: string | null;
          id?: string;
          processed?: boolean;
          processed_at?: string | null;
          raw_payload: Json;
          received_at?: string | null;
          source: string;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          error_message?: string | null;
          event_type?: string | null;
          external_event_id?: string | null;
          gave_up_at?: string | null;
          id?: string;
          processed?: boolean;
          processed_at?: string | null;
          raw_payload?: Json;
          received_at?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_events_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      rejected_questions: {
        Row: {
          id: string;
          original_id: string;
          question_snapshot: Json;
          choices_snapshot: Json;
          rejected_at: string;
          rejected_by_user_id: string | null;
          rejected_reason: string | null;
          source_pdf: string | null;
          source_page: number | null;
          domain: string | null;
          subject: string | null;
          question_preview: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          original_id: string;
          question_snapshot: Json;
          choices_snapshot?: Json;
          rejected_at?: string;
          rejected_by_user_id?: string | null;
          rejected_reason?: string | null;
          source_pdf?: string | null;
          source_page?: number | null;
          domain?: string | null;
          subject?: string | null;
          question_preview?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          original_id?: string;
          question_snapshot?: Json;
          choices_snapshot?: Json;
          rejected_at?: string;
          rejected_by_user_id?: string | null;
          rejected_reason?: string | null;
          source_pdf?: string | null;
          source_page?: number | null;
          domain?: string | null;
          subject?: string | null;
          question_preview?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      active_cohort_for_student: {
        Row: {
          cohort_id: string | null;
          cohort_name: string | null;
          current_topic: string | null;
          max_size: number | null;
          sat_date: string | null;
          status: string | null;
          tier: string | null;
          tutor_user_id: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cohort_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "cohort_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohorts_sat_date_fkey";
            columns: ["sat_date"];
            isOneToOne: false;
            referencedRelation: "sat_dates";
            referencedColumns: ["test_date"];
          },
          {
            foreignKeyName: "cohorts_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "tutor_earnings_summary";
            referencedColumns: ["tutor_user_id"];
          },
          {
            foreignKeyName: "cohorts_tutor_user_id_fkey";
            columns: ["tutor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions_live: {
        // Read-only view of quiz_questions filtered to is_live = true.
        // Student-facing query code reads from this view so flagged /
        // needs_review / inferred-answer rows can never reach students
        // (audit finding CRIT-2). Migration 20260518004500.
        // Columns mirror quiz_questions.Row.
        Row: {
          answer_format: Database["public"]["Enums"]["question_format"] | null;
          answer_source: string | null;
          concept_slug: string | null;
          content_hash: string | null;
          correct_answer: string | null;
          created_at: string | null;
          desmos_strategy: string | null;
          difficulty: Database["public"]["Enums"]["question_difficulty"] | null;
          difficulty_level: number | null;
          display_order: number | null;
          domain: string | null;
          explanation_per_choice: Json | null;
          explanation_text: string | null;
          flag_count: number | null;
          hint: string | null;
          id: string | null;
          image_alt: string | null;
          image_storage_path: string | null;
          image_url: string | null;
          figure_kind: "image" | "table" | "chart" | "svg" | null;
          figure_table_data: Json | null;
          figure_chart_data: Json | null;
          import_flag_reason: string | null;
          import_flag_type: string | null;
          import_status: string | null;
          is_flagged: boolean | null;
          is_live: boolean | null;
          node_id: string | null;
          numeric_tolerance: number | null;
          passage: string | null;
          passage_a: string | null;
          passage_b: string | null;
          passage_intro: string | null;
          question_text: string | null;
          question_type: Database["public"]["Enums"]["question_type"] | null;
          source_page: number | null;
          source_pdf: string | null;
          subject: Database["public"]["Enums"]["quiz_subject"] | null;
          topic_cluster: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      tutor_earnings_summary: {
        Row: {
          approved_amount: number | null;
          last_refreshed_at: string | null;
          paid_amount: number | null;
          pending_amount: number | null;
          sessions_paid: number | null;
          sessions_with_recap: number | null;
          total_earnings: number | null;
          total_hours_worked: number | null;
          tutor_user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      refresh_tutor_earnings_summary: { Args: never; Returns: undefined };
    };
    Enums: {
      answer_letter: "A" | "B" | "C" | "D";
      confidence_band: "struggling" | "developing" | "proficient" | "mastered";
      override_status: "locked" | "unlocked" | "in_progress" | "partially_complete" | "mastered";
      question_difficulty: "foundational" | "intermediate" | "advanced" | "mastery";
      question_format: "multiple_choice" | "numeric_entry";
      question_type:
        | "multiple_choice"
        | "evidence_based"
        | "math_computation"
        | "math_word_problem";
      quiz_subject: "reading" | "math";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      answer_letter: ["A", "B", "C", "D"],
      confidence_band: ["struggling", "developing", "proficient", "mastered"],
      override_status: ["locked", "unlocked", "in_progress", "partially_complete", "mastered"],
      question_difficulty: ["foundational", "intermediate", "advanced", "mastery"],
      question_format: ["multiple_choice", "numeric_entry"],
      question_type: ["multiple_choice", "evidence_based", "math_computation", "math_word_problem"],
      quiz_subject: ["reading", "math"],
    },
  },
} as const;
