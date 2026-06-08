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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          archivada: boolean
          created_at: string
          descripcion: string | null
          dias_semana: number[] | null
          estado: Database["public"]["Enums"]["estado_actividad"]
          id: string
          in_progress_started_at: string | null
          pomodoros_completados: number
          tiempo_enfoque_segundos: number
          tipo: Database["public"]["Enums"]["tipo_actividad"]
          titulo: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          archivada?: boolean
          created_at?: string
          descripcion?: string | null
          dias_semana?: number[] | null
          estado?: Database["public"]["Enums"]["estado_actividad"]
          id?: string
          in_progress_started_at?: string | null
          pomodoros_completados?: number
          tiempo_enfoque_segundos?: number
          tipo: Database["public"]["Enums"]["tipo_actividad"]
          titulo: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          archivada?: boolean
          created_at?: string
          descripcion?: string | null
          dias_semana?: number[] | null
          estado?: Database["public"]["Enums"]["estado_actividad"]
          id?: string
          in_progress_started_at?: string | null
          pomodoros_completados?: number
          tiempo_enfoque_segundos?: number
          tipo?: Database["public"]["Enums"]["tipo_actividad"]
          titulo?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_productividad: {
        Row: {
          created_at: string
          fecha: string
          id: string
          pomodoros_completados: number
          porcentaje: number | null
          tareas_eficientes: number
          total_completadas: number
          total_planificadas: number
          usuario_id: string
        }
        Insert: {
          created_at?: string
          fecha: string
          id?: string
          pomodoros_completados?: number
          porcentaje?: number | null
          tareas_eficientes?: number
          total_completadas?: number
          total_planificadas?: number
          usuario_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          pomodoros_completados?: number
          porcentaje?: number | null
          tareas_eficientes?: number
          total_completadas?: number
          total_planificadas?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_productividad_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nombre: string | null
          timezone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nombre?: string | null
          timezone?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre?: string | null
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_pomodoro: {
        Args: {
          actividad_id: string
          segundos_enfoque?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      estado_actividad: "todo" | "in_progress" | "done"
      tipo_actividad: "tarea_unica" | "habito_ciclico"
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
      estado_actividad: ["todo", "in_progress", "done"],
      tipo_actividad: ["tarea_unica", "habito_ciclico"],
    },
  },
} as const
