export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          title: string;
          location: string;
          budget: number;
          cuisine_preference: string[];
          status: "open" | "choosing" | "matched" | "decided" | "closed";
          final_restaurant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          location: string;
          budget: number;
          cuisine_preference?: string[];
          status?: "open" | "choosing" | "matched" | "decided" | "closed";
          final_restaurant_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          location?: string;
          budget?: number;
          cuisine_preference?: string[];
          status?: "open" | "choosing" | "matched" | "decided" | "closed";
          final_restaurant_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          name: string;
          avatar: string;
          joined_at: string;
        };
        Insert: {
          id: string;
          room_id: string;
          name: string;
          avatar?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          name?: string;
          avatar?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      swipes: {
        Row: {
          id: string;
          room_id: string;
          member_id: string;
          restaurant_id: string;
          choice: "like" | "pass";
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          member_id: string;
          restaurant_id: string;
          choice: "like" | "pass";
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          member_id?: string;
          restaurant_id?: string;
          choice?: "like" | "pass";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "swipes_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "room_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "swipes_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
