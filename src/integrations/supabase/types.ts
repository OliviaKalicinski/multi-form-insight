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
      ads_data: {
        Row: {
          adicoes_carrinho: number | null
          alcance: number | null
          anuncio: string | null
          campanha: string | null
          cliques: number | null
          cliques_link: number | null
          cliques_saida: number | null
          conjunto: string | null
          conversoes: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          ctr_saida: number | null
          custo_adicao_carrinho: number | null
          custo_por_compra: number | null
          custo_por_resultado: number | null
          custo_por_visualizacao: number | null
          data: string
          engajamentos: number | null
          frequencia: number | null
          gasto: number | null
          id: string
          impressoes: number | null
          nivel_veiculacao: string | null
          objetivo: string | null
          receita: number | null
          resultados: number | null
          roas_resultados: number | null
          status_veiculacao: string | null
          tipo_resultado: string | null
          upload_id: string | null
          visitas_perfil: number | null
          visualizacoes: number | null
          visualizacoes_pagina: number | null
        }
        Insert: {
          adicoes_carrinho?: number | null
          alcance?: number | null
          anuncio?: string | null
          campanha?: string | null
          cliques?: number | null
          cliques_link?: number | null
          cliques_saida?: number | null
          conjunto?: string | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          ctr_saida?: number | null
          custo_adicao_carrinho?: number | null
          custo_por_compra?: number | null
          custo_por_resultado?: number | null
          custo_por_visualizacao?: number | null
          data: string
          engajamentos?: number | null
          frequencia?: number | null
          gasto?: number | null
          id?: string
          impressoes?: number | null
          nivel_veiculacao?: string | null
          objetivo?: string | null
          receita?: number | null
          resultados?: number | null
          roas_resultados?: number | null
          status_veiculacao?: string | null
          tipo_resultado?: string | null
          upload_id?: string | null
          visitas_perfil?: number | null
          visualizacoes?: number | null
          visualizacoes_pagina?: number | null
        }
        Update: {
          adicoes_carrinho?: number | null
          alcance?: number | null
          anuncio?: string | null
          campanha?: string | null
          cliques?: number | null
          cliques_link?: number | null
          cliques_saida?: number | null
          conjunto?: string | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          ctr_saida?: number | null
          custo_adicao_carrinho?: number | null
          custo_por_compra?: number | null
          custo_por_resultado?: number | null
          custo_por_visualizacao?: number | null
          data?: string
          engajamentos?: number | null
          frequencia?: number | null
          gasto?: number | null
          id?: string
          impressoes?: number | null
          nivel_veiculacao?: string | null
          objetivo?: string | null
          receita?: number | null
          resultados?: number | null
          roas_resultados?: number | null
          status_veiculacao?: string | null
          tipo_resultado?: string | null
          upload_id?: string | null
          visitas_perfil?: number | null
          visualizacoes?: number | null
          visualizacoes_pagina?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      audience_data: {
        Row: {
          cidades: Json
          created_at: string
          data_referencia: string
          faixa_etaria_genero: Json
          id: string
          metricas_calculadas: Json
          paises: Json
          upload_id: string | null
        }
        Insert: {
          cidades?: Json
          created_at?: string
          data_referencia: string
          faixa_etaria_genero?: Json
          id?: string
          metricas_calculadas?: Json
          paises?: Json
          upload_id?: string | null
        }
        Update: {
          cidades?: Json
          created_at?: string
          data_referencia?: string
          faixa_etaria_genero?: Json
          id?: string
          metricas_calculadas?: Json
          paises?: Json
          upload_id?: string | null
        }
        Relationships: []
      }
      decision_events: {
        Row: {
          based_on_metric: string
          benchmark_at_generation: number | null
          category: string
          created_at: string | null
          expires_at: string
          generated_at: string | null
          id: string
          metric_value_at_generation: number | null
          period_reference: string
          recommendation_id: string
          recommendation_title: string
          rejection_reason: string | null
          status: string | null
          status_changed_at: string | null
          updated_at: string | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          based_on_metric: string
          benchmark_at_generation?: number | null
          category: string
          created_at?: string | null
          expires_at: string
          generated_at?: string | null
          id?: string
          metric_value_at_generation?: number | null
          period_reference: string
          recommendation_id: string
          recommendation_title: string
          rejection_reason?: string | null
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          based_on_metric?: string
          benchmark_at_generation?: number | null
          category?: string
          created_at?: string | null
          expires_at?: string
          generated_at?: string | null
          id?: string
          metric_value_at_generation?: number | null
          period_reference?: string
          recommendation_id?: string
          recommendation_title?: string
          rejection_reason?: string | null
          status?: string | null
          status_changed_at?: string | null
          updated_at?: string | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: []
      }
      followers_data: {
        Row: {
          created_at: string | null
          data: string
          id: string
          novos_seguidores: number | null
          total_seguidores: number | null
          unfollows: number | null
          upload_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          novos_seguidores?: number | null
          total_seguidores?: number | null
          unfollows?: number | null
          upload_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          novos_seguidores?: number | null
          total_seguidores?: number | null
          unfollows?: number | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followers_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_data: {
        Row: {
          created_at: string | null
          data: string
          id: string
          metrica: string | null
          upload_id: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          metrica?: string | null
          upload_id?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          metrica?: string | null
          upload_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_data: {
        Row: {
          canal: string | null
          cidade: string | null
          cliente_email: string | null
          cliente_nome: string | null
          created_at: string | null
          cupom: string | null
          data_venda: string
          estado: string | null
          forma_envio: string | null
          id: string
          numero_pedido: string
          produtos: Json
          status: string | null
          upload_id: string | null
          valor_frete: number | null
          valor_total: number
        }
        Insert: {
          canal?: string | null
          cidade?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          created_at?: string | null
          cupom?: string | null
          data_venda: string
          estado?: string | null
          forma_envio?: string | null
          id?: string
          numero_pedido: string
          produtos: Json
          status?: string | null
          upload_id?: string | null
          valor_frete?: number | null
          valor_total: number
        }
        Update: {
          canal?: string | null
          cidade?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          created_at?: string | null
          cupom?: string | null
          data_venda?: string
          estado?: string | null
          forma_envio?: string | null
          id?: string
          numero_pedido?: string
          produtos?: Json
          status?: string | null
          upload_id?: string | null
          valor_frete?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_data_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "upload_history"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_history: {
        Row: {
          created_at: string
          data_type: string
          date_range_end: string | null
          date_range_start: string | null
          file_name: string | null
          id: string
          record_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data_type: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_name?: string | null
          id?: string
          record_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_name?: string | null
          id?: string
          record_count?: number
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_decisions: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_first_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "viewer"
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
      app_role: ["admin", "viewer"],
    },
  },
} as const
