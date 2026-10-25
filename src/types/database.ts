export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReportStatus =
  | "uploading"
  | "processing"
  | "extracted"
  | "analyzing"
  | "completed"
  | "failed";

export type SexType = "male" | "female" | "other";
export type DietPreferenceType = "veg" | "non-veg" | "vegan";
export type LanguageType = "en" | "hi";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          age: number | null;
          sex: SexType | null;
          diet_preference: DietPreferenceType | null;
          language: LanguageType;
          consent_given_at: string | null;
          keep_original_files: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          age?: number | null;
          sex?: SexType | null;
          diet_preference?: DietPreferenceType | null;
          language?: LanguageType;
          consent_given_at?: string | null;
          keep_original_files?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          age?: number | null;
          sex?: SexType | null;
          diet_preference?: DietPreferenceType | null;
          language?: LanguageType;
          consent_given_at?: string | null;
          keep_original_files?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          report_date: string | null;
          report_type: string | null;
          status: ReportStatus;
          storage_file_paths: string[];
          extracted_data: Json | null;
          confirmed_data: Json | null;
          analysis_data: Json | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          report_date?: string | null;
          report_type?: string | null;
          status?: ReportStatus;
          storage_file_paths?: string[];
          extracted_data?: Json | null;
          confirmed_data?: Json | null;
          analysis_data?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          report_date?: string | null;
          report_type?: string | null;
          status?: ReportStatus;
          storage_file_paths?: string[];
          extracted_data?: Json | null;
          confirmed_data?: Json | null;
          analysis_data?: Json | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          feedback: "helpful" | "unhelpful" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          feedback?: "helpful" | "unhelpful" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          feedback?: "helpful" | "unhelpful" | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      report_status: ReportStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
export type ChatConversationRow = Database["public"]["Tables"]["chat_conversations"]["Row"];
export type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];

