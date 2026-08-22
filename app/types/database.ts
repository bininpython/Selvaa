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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string
          icon: string | null
          id: string
          name: string
          points: number
          threshold: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          name: string
          points?: number
          threshold?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          name?: string
          points?: number
          threshold?: number | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_type: string
          avg_pace: number | null
          avg_speed: number | null
          created_at: string
          description: string | null
          difficulty: string | null
          distance_m: number
          duration_seconds: number
          elevation_gain_m: number
          elevation_loss_m: number
          finished_at: string | null
          id: string
          max_altitude_m: number | null
          max_speed: number | null
          min_altitude_m: number | null
          moving_time_seconds: number
          route_geojson: Json | null
          started_at: string
          sync_status: string
          title: string
          trail_conditions: string | null
          trail_id: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          activity_type: string
          avg_pace?: number | null
          avg_speed?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          distance_m?: number
          duration_seconds?: number
          elevation_gain_m?: number
          elevation_loss_m?: number
          finished_at?: string | null
          id?: string
          max_altitude_m?: number | null
          max_speed?: number | null
          min_altitude_m?: number | null
          moving_time_seconds?: number
          route_geojson?: Json | null
          started_at: string
          sync_status?: string
          title: string
          trail_conditions?: string | null
          trail_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          activity_type?: string
          avg_pace?: number | null
          avg_speed?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          distance_m?: number
          duration_seconds?: number
          elevation_gain_m?: number
          elevation_loss_m?: number
          finished_at?: string | null
          id?: string
          max_altitude_m?: number | null
          max_speed?: number | null
          min_altitude_m?: number | null
          moving_time_seconds?: number
          route_geojson?: Json | null
          started_at?: string
          sync_status?: string
          title?: string
          trail_conditions?: string | null
          trail_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_photos: {
        Row: {
          activity_id: string
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          storage_path: string
          user_id: string
        }
        Insert: {
          activity_id: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path: string
          user_id: string
        }
        Update: {
          activity_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_photos_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_points: {
        Row: {
          accuracy: number | null
          activity_id: string
          altitude: number | null
          geography: unknown
          id: number
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          activity_id: string
          altitude?: number | null
          geography?: unknown
          id?: never
          latitude: number
          longitude: number
          recorded_at: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          activity_id?: string
          altitude?: number | null
          geography?: unknown
          id?: never
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_points_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_reports: {
        Row: {
          category: string
          confirmation_count: number
          created_at: string
          description: string
          geography: unknown
          id: string
          latitude: number
          longitude: number
          photo_url: string | null
          resolved_at: string | null
          status: string
          trail_id: string | null
          user_id: string
        }
        Insert: {
          category: string
          confirmation_count?: number
          created_at?: string
          description: string
          geography?: unknown
          id?: string
          latitude: number
          longitude: number
          photo_url?: string | null
          resolved_at?: string | null
          status?: string
          trail_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          confirmation_count?: number
          created_at?: string
          description?: string
          geography?: unknown
          id?: string
          latitude?: number
          longitude?: number
          photo_url?: string | null
          resolved_at?: string | null
          status?: string
          trail_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "environment_reports_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          joined_at: string
          response: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          response?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          difficulty: string | null
          distance: number | null
          geography: unknown
          group_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          max_participants: number | null
          meeting_point: string | null
          name: string
          recommended_equipment: string[] | null
          start_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          difficulty?: string | null
          distance?: number | null
          geography?: unknown
          group_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          meeting_point?: string | null
          name: string
          recommended_equipment?: string[] | null
          start_at: string
          visibility?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          distance?: number | null
          geography?: unknown
          group_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          meeting_point?: string | null
          name?: string
          recommended_equipment?: string[] | null
          start_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          activity_id: string | null
          body: string
          created_at: string
          group_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          body: string
          created_at?: string
          group_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          member_count: number
          name: string
          owner_id: string
          privacy: string
          slug: string
          state: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          name: string
          owner_id: string
          privacy?: string
          slug: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          name?: string
          owner_id?: string
          privacy?: string
          slug?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          category: string
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          geography: unknown
          id: string
          latitude: number
          longitude: number
          name: string
          state: string | null
          verified: boolean
        }
        Insert: {
          category: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          geography?: unknown
          id?: string
          latitude: number
          longitude: number
          name: string
          state?: string | null
          verified?: boolean
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          geography?: unknown
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          state?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "places_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_photos: {
        Row: {
          created_at: string
          id: string
          post_id: string
          sort_order: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          sort_order?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_photos_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          activity_id: string | null
          body: string | null
          created_at: string
          id: string
          location: string | null
          title: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          location?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          activity_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          location?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string
          cover_url: string | null
          created_at: string
          experience_level: string
          full_name: string
          hide_route_endpoints: boolean
          id: string
          interests: string[]
          profile_visibility: string
          state: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          experience_level?: string
          full_name: string
          hide_route_endpoints?: boolean
          id: string
          interests?: string[]
          profile_visibility?: string
          state?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string
          cover_url?: string | null
          created_at?: string
          experience_level?: string
          full_name?: string
          hide_route_endpoints?: boolean
          id?: string
          interests?: string[]
          profile_visibility?: string
          state?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      report_confirmations: {
        Row: {
          created_at: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "environment_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_conditions: {
        Row: {
          condition: string
          created_at: string
          id: string
          notes: string | null
          trail_id: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          notes?: string | null
          trail_id: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          notes?: string | null
          trail_id?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_conditions_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_conditions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          storage_path: string
          trail_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
          trail_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
          trail_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_photos_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          trail_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          trail_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          trail_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_reviews_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          best_season: string | null
          camping_area: boolean | null
          cell_signal: string | null
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          distance_m: number
          elevation_gain: number
          entrance_fee: number | null
          estimated_duration: number | null
          geography: unknown
          guide_required: boolean | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          max_altitude_m: number | null
          name: string
          parking: boolean | null
          pets_allowed: boolean | null
          region: string | null
          route_geojson: Json | null
          slug: string
          state: string | null
          terrain_type: string | null
          updated_at: string
          verified: boolean
          water_source: boolean | null
        }
        Insert: {
          best_season?: string | null
          camping_area?: boolean | null
          cell_signal?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          distance_m?: number
          elevation_gain?: number
          entrance_fee?: number | null
          estimated_duration?: number | null
          geography?: unknown
          guide_required?: boolean | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_altitude_m?: number | null
          name: string
          parking?: boolean | null
          pets_allowed?: boolean | null
          region?: string | null
          route_geojson?: Json | null
          slug: string
          state?: string | null
          terrain_type?: string | null
          updated_at?: string
          verified?: boolean
          water_source?: boolean | null
        }
        Update: {
          best_season?: string | null
          camping_area?: boolean | null
          cell_signal?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          distance_m?: number
          elevation_gain?: number
          entrance_fee?: number | null
          estimated_duration?: number | null
          geography?: unknown
          guide_required?: boolean | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_altitude_m?: number | null
          name?: string
          parking?: boolean | null
          pets_allowed?: boolean | null
          region?: string | null
          route_geojson?: Json | null
          slug?: string
          state?: string | null
          terrain_type?: string | null
          updated_at?: string
          verified?: boolean
          water_source?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trails_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          activity_count: number
          places_discovered: number
          reputation_points: number
          states_explored: number
          total_distance_m: number
          total_duration_seconds: number
          total_elevation_gain_m: number
          trails_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_count?: number
          places_discovered?: number
          reputation_points?: number
          states_explored?: number
          total_distance_m?: number
          total_duration_seconds?: number
          total_elevation_gain_m?: number
          trails_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_count?: number
          places_discovered?: number
          reputation_points?: number
          states_explored?: number
          total_distance_m?: number
          total_duration_seconds?: number
          total_elevation_gain_m?: number
          trails_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      nearby_trails: {
        Args: { lat: number; lng: number; radius_m?: number }
        Returns: {
          best_season: string | null
          camping_area: boolean | null
          cell_signal: string | null
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          distance_m: number
          elevation_gain: number
          entrance_fee: number | null
          estimated_duration: number | null
          geography: unknown
          guide_required: boolean | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          max_altitude_m: number | null
          name: string
          parking: boolean | null
          pets_allowed: boolean | null
          region: string | null
          route_geojson: Json | null
          slug: string
          state: string | null
          terrain_type: string | null
          updated_at: string
          verified: boolean
          water_source: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "trails"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
