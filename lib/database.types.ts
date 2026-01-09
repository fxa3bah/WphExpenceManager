export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'employee' | 'manager' | 'admin' | 'ceo'
          manager_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'employee' | 'manager' | 'admin'
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'employee' | 'manager' | 'admin'
          manager_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          trip_id: string | null
          amount: number
          currency: string
          category: string
          merchant_name: string | null
          description: string | null
          entertainment_people_count: number | null
          expense_date: string
          receipt_url: string | null
          location: string | null
          gps_coordinates: Json | null
          ocr_data: Json | null
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          submitted_at: string | null
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trip_id?: string | null
          amount: number
          currency?: string
          category: string
          merchant_name?: string | null
          description?: string | null
          entertainment_people_count?: number | null
          expense_date: string
          receipt_url?: string | null
          location?: string | null
          gps_coordinates?: Json | null
          ocr_data?: Json | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trip_id?: string | null
          amount?: number
          currency?: string
          category?: string
          merchant_name?: string | null
          description?: string | null
          entertainment_people_count?: number | null
          expense_date?: string
          receipt_url?: string | null
          location?: string | null
          gps_coordinates?: Json | null
          ocr_data?: Json | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          submitted_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      manager_allowed_emails: {
        Row: {
          id: string
          manager_id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          manager_id: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          manager_id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string
          trip_name: string
          destination: string | null
          start_date: string
          end_date: string | null
          status: 'active' | 'completed' | 'cancelled'
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trip_name: string
          destination?: string | null
          start_date: string
          end_date?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trip_name?: string
          destination?: string | null
          start_date?: string
          end_date?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
