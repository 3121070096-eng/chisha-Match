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
          restaurant_source: string;
          location_area_key: string | null;
          location_city: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_radius_m: number | null;
          location_source: string | null;
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
          restaurant_source?: string;
          location_area_key?: string | null;
          location_city?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_radius_m?: number | null;
          location_source?: string | null;
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
          restaurant_source?: string;
          location_area_key?: string | null;
          location_city?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_radius_m?: number | null;
          location_source?: string | null;
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
      feedback: {
        Row: {
          id: string;
          room_id: string | null;
          rating: "good" | "ok" | "bad";
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          rating: "good" | "ok" | "bad";
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string | null;
          rating?: "good" | "ok" | "bad";
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          room_id: string | null;
          member_id: string | null;
          event_name: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          member_id?: string | null;
          event_name: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string | null;
          member_id?: string | null;
          event_name?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "room_members";
            referencedColumns: ["id"];
          }
        ];
      };
      restaurant_cache: {
        Row: {
          id: string;
          source: string;
          source_place_id: string;
          name: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          area_key: string | null;
          cuisine: string | null;
          price_level: string | null;
          rating: number | null;
          distance_text: string | null;
          tags: string[] | null;
          images: string[] | null;
          photo_refs: string[] | null;
          raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          source_place_id: string;
          name: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          area_key?: string | null;
          cuisine?: string | null;
          price_level?: string | null;
          rating?: number | null;
          distance_text?: string | null;
          tags?: string[] | null;
          images?: string[] | null;
          photo_refs?: string[] | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          source_place_id?: string;
          name?: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          area_key?: string | null;
          cuisine?: string | null;
          price_level?: string | null;
          rating?: number | null;
          distance_text?: string | null;
          tags?: string[] | null;
          images?: string[] | null;
          photo_refs?: string[] | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_restaurants: {
        Row: {
          id: string;
          room_id: string | null;
          restaurant_id: string | null;
          rank: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id?: string | null;
          restaurant_id?: string | null;
          rank?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string | null;
          restaurant_id?: string | null;
          rank?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_restaurants_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_restaurants_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_cache";
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
