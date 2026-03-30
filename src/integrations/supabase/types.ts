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
          ad_id: string | null
          add_to_cart: number | null
          adicoes_carrinho: number | null
          adset_id: string | null
          alcance: number | null
          anuncio: string | null
          campaign_id: string | null
          campanha: string | null
          cliques: number | null
          cliques_link: number | null
          cliques_saida: number | null
          conjunto: string | null
          conversion_rate_ranking: string | null
          conversoes: number | null
          cpc: number | null
          cpm: number | null
          cpp: number | null
          created_at: string | null
          ctr: number | null
          ctr_saida: number | null
          custo_adicao_carrinho: number | null
          custo_por_compra: number | null
          custo_por_resultado: number | null
          custo_por_visualizacao: number | null
          data: string
          effective_status: string | null
          engagement_rate_ranking: string | null
          engajamentos: number | null
          frequencia: number | null
          gasto: number | null
          hook_rate: number | null
          id: string
          impressoes: number | null
          initiate_checkout: number | null
          leads: number | null
          nivel_veiculacao: string | null
          objetivo: string | null
          outbound_clicks: number | null
          purchase_value: number | null
          purchases: number | null
          quality_ranking: string | null
          receita: number | null
          resultados: number | null
          roas: number | null
          roas_resultados: number | null
          source: string | null
          status_veiculacao: string | null
          tipo_resultado: string | null
          upload_id: string | null
          video_p100_watched: number | null
          video_p25_watched: number | null
          video_p50_watched: number | null
          video_p75_watched: number | null
          view_content: number | null
          visitas_perfil: number | null
          visualizacoes: number | null
          visualizacoes_pagina: number | null
        }
        Insert: {
          ad_id?: string | null
          add_to_cart?: number | null
          adicoes_carrinho?: number | null
          adset_id?: string | null
          alcance?: number | null
          anuncio?: string | null
          campaign_id?: string | null
          campanha?: string | null
          cliques?: number | null
          cliques_link?: number | null
          cliques_saida?: number | null
          conjunto?: string | null
          conversion_rate_ranking?: string | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string | null
          ctr?: number | null
          ctr_saida?: number | null
          custo_adicao_carrinho?: number | null
          custo_por_compra?: number | null
          custo_por_resultado?: number | null
          custo_por_visualizacao?: number | null
          data: string
          effective_status?: string | null
          engagement_rate_ranking?: string | null
          engajamentos?: number | null
          frequencia?: number | null
          gasto?: number | null
          hook_rate?: number | null
          id?: string
          impressoes?: number | null
          initiate_checkout?: number | null
          leads?: number | null
          nivel_veiculacao?: string | null
          objetivo?: string | null
          outbound_clicks?: number | null
          purchase_value?: number | null
          purchases?: number | null
          quality_ranking?: string | null
          receita?: number | null
          resultados?: number | null
          roas?: number | null
          roas_resultados?: number | null
          source?: string | null
          status_veiculacao?: string | null
          tipo_resultado?: string | null
          upload_id?: string | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          view_content?: number | null
          visitas_perfil?: number | null
          visualizacoes?: number | null
          visualizacoes_pagina?: number | null
        }
        Update: {
          ad_id?: string | null
          add_to_cart?: number | null
          adicoes_carrinho?: number | null
          adset_id?: string | null
          alcance?: number | null
          anuncio?: string | null
          campaign_id?: string | null
          campanha?: string | null
          cliques?: number | null
          cliques_link?: number | null
          cliques_saida?: number | null
          conjunto?: string | null
          conversion_rate_ranking?: string | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string | null
          ctr?: number | null
          ctr_saida?: number | null
          custo_adicao_carrinho?: number | null
          custo_por_compra?: number | null
          custo_por_resultado?: number | null
          custo_por_visualizacao?: number | null
          data?: string
          effective_status?: string | null
          engagement_rate_ranking?: string | null
          engajamentos?: number | null
          frequencia?: number | null
          gasto?: number | null
          hook_rate?: number | null
          id?: string
          impressoes?: number | null
          initiate_checkout?: number | null
          leads?: number | null
          nivel_veiculacao?: string | null
          objetivo?: string | null
          outbound_clicks?: number | null
          purchase_value?: number | null
          purchases?: number | null
          quality_ranking?: string | null
          receita?: number | null
          resultados?: number | null
          roas?: number | null
          roas_resultados?: number | null
          source?: string | null
          status_veiculacao?: string | null
          tipo_resultado?: string | null
          upload_id?: string | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          view_content?: number | null
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
      blog_performance: {
        Row: {
          avg_time_on_page: number | null
          backlinks: number | null
          bounce_rate: number | null
          created_at: string | null
          ctr: number | null
          id: string
          internal_links: number | null
          keyword_position: number | null
          measured_at: string | null
          organic_clicks: number | null
          organic_impressions: number | null
          pageviews: number | null
          post_title: string
          post_type: string | null
          post_url: string
          published_at: string | null
          revenue: number | null
          sessions: number | null
          target_keyword: string | null
          transactions: number | null
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          avg_time_on_page?: number | null
          backlinks?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          internal_links?: number | null
          keyword_position?: number | null
          measured_at?: string | null
          organic_clicks?: number | null
          organic_impressions?: number | null
          pageviews?: number | null
          post_title: string
          post_type?: string | null
          post_url: string
          published_at?: string | null
          revenue?: number | null
          sessions?: number | null
          target_keyword?: string | null
          transactions?: number | null
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          avg_time_on_page?: number | null
          backlinks?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          internal_links?: number | null
          keyword_position?: number | null
          measured_at?: string | null
          organic_clicks?: number | null
          organic_impressions?: number | null
          pageviews?: number | null
          post_title?: string
          post_type?: string | null
          post_url?: string
          published_at?: string | null
          revenue?: number | null
          sessions?: number | null
          target_keyword?: string | null
          transactions?: number | null
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      budget_attachments: {
        Row: {
          budget_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
        }
        Relationships: []
      }
      budget_requests: {
        Row: {
          calendar_event_id: string | null
          created_at: string
          deadline_date: string
          description: string | null
          event_end_date: string | null
          event_start_date: string | null
          financial_approved_at: string | null
          financial_notes: string | null
          financial_status: string
          id: string
          justification: string | null
          marketing_approved_at: string | null
          marketing_notes: string | null
          marketing_status: string
          needs_financial: boolean
          needs_marketing: boolean
          needs_operations: boolean
          operations_approved_at: string | null
          operations_notes: string | null
          operations_status: string
          request_date: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          calendar_event_id?: string | null
          created_at?: string
          deadline_date: string
          description?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          financial_approved_at?: string | null
          financial_notes?: string | null
          financial_status?: string
          id?: string
          justification?: string | null
          marketing_approved_at?: string | null
          marketing_notes?: string | null
          marketing_status?: string
          needs_financial?: boolean
          needs_marketing?: boolean
          needs_operations?: boolean
          operations_approved_at?: string | null
          operations_notes?: string | null
          operations_status?: string
          request_date?: string
          title: string
          updated_at?: string
          value: number
        }
        Update: {
          calendar_event_id?: string | null
          created_at?: string
          deadline_date?: string
          description?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          financial_approved_at?: string | null
          financial_notes?: string | null
          financial_status?: string
          id?: string
          justification?: string | null
          marketing_approved_at?: string | null
          marketing_notes?: string | null
          marketing_status?: string
          needs_financial?: boolean
          needs_marketing?: boolean
          needs_operations?: boolean
          operations_approved_at?: string | null
          operations_notes?: string | null
          operations_status?: string
          request_date?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_requests_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "marketing_calendar"
            referencedColumns: ["id"]
          },
        ]
      }
      customer: {
        Row: {
          average_days_between_purchases: number | null
          cpf_cnpj: string
          created_at: string | null
          first_order_date: string | null
          id: string
          is_active: boolean
          journey_stage: string | null
          last_contact_date: string | null
          last_order_date: string | null
          merged_into: string | null
          nome: string | null
          observacoes: string | null
          prioridade: string | null
          recalculated_at: string | null
          responsavel: string | null
          segment: string | null
          status_manual: string | null
          tags: Json | null
          ticket_medio: number | null
          total_orders_all: number
          total_orders_revenue: number
          total_revenue: number
          updated_at: string | null
        }
        Insert: {
          average_days_between_purchases?: number | null
          cpf_cnpj: string
          created_at?: string | null
          first_order_date?: string | null
          id?: string
          is_active?: boolean
          journey_stage?: string | null
          last_contact_date?: string | null
          last_order_date?: string | null
          merged_into?: string | null
          nome?: string | null
          observacoes?: string | null
          prioridade?: string | null
          recalculated_at?: string | null
          responsavel?: string | null
          segment?: string | null
          status_manual?: string | null
          tags?: Json | null
          ticket_medio?: number | null
          total_orders_all?: number
          total_orders_revenue?: number
          total_revenue?: number
          updated_at?: string | null
        }
        Update: {
          average_days_between_purchases?: number | null
          cpf_cnpj?: string
          created_at?: string | null
          first_order_date?: string | null
          id?: string
          is_active?: boolean
          journey_stage?: string | null
          last_contact_date?: string | null
          last_order_date?: string | null
          merged_into?: string | null
          nome?: string | null
          observacoes?: string | null
          prioridade?: string | null
          recalculated_at?: string | null
          responsavel?: string | null
          segment?: string | null
          status_manual?: string | null
          tags?: Json | null
          ticket_medio?: number | null
          total_orders_all?: number
          total_orders_revenue?: number
          total_revenue?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "customer_full"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_complaint: {
        Row: {
          acao_orientacao: string | null
          atendente: string | null
          atendimento_numero: string | null
          canal: string | null
          created_at: string | null
          created_by: string | null
          custo_estimado: number | null
          customer_id: string
          data_contato: string | null
          data_fabricacao: string | null
          data_fechamento: string | null
          descricao: string
          gravidade: string | null
          id: string
          link_reclamacao: string | null
          local_compra: string | null
          lote: string | null
          natureza_pedido: string | null
          nf_produto: string | null
          order_id: string | null
          produto: string | null
          status: string
          tipo_reclamacao: string | null
          transportador: string | null
          updated_at: string | null
        }
        Insert: {
          acao_orientacao?: string | null
          atendente?: string | null
          atendimento_numero?: string | null
          canal?: string | null
          created_at?: string | null
          created_by?: string | null
          custo_estimado?: number | null
          customer_id: string
          data_contato?: string | null
          data_fabricacao?: string | null
          data_fechamento?: string | null
          descricao: string
          gravidade?: string | null
          id?: string
          link_reclamacao?: string | null
          local_compra?: string | null
          lote?: string | null
          natureza_pedido?: string | null
          nf_produto?: string | null
          order_id?: string | null
          produto?: string | null
          status?: string
          tipo_reclamacao?: string | null
          transportador?: string | null
          updated_at?: string | null
        }
        Update: {
          acao_orientacao?: string | null
          atendente?: string | null
          atendimento_numero?: string | null
          canal?: string | null
          created_at?: string | null
          created_by?: string | null
          custo_estimado?: number | null
          customer_id?: string
          data_contato?: string | null
          data_fabricacao?: string | null
          data_fechamento?: string | null
          descricao?: string
          gravidade?: string | null
          id?: string
          link_reclamacao?: string | null
          local_compra?: string | null
          lote?: string | null
          natureza_pedido?: string | null
          nf_produto?: string | null
          order_id?: string | null
          produto?: string | null
          status?: string
          tipo_reclamacao?: string | null
          transportador?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_complaint_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaint_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaint_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_data"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contact_log: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          data_contato: string
          id: string
          motivo: string | null
          responsavel: string | null
          resultado: string | null
          resumo: string
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          data_contato?: string
          id?: string
          motivo?: string | null
          responsavel?: string | null
          resultado?: string | null
          resumo: string
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          data_contato?: string
          id?: string
          motivo?: string | null
          responsavel?: string | null
          resultado?: string | null
          resumo?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contact_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contact_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_full"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_identifier: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          is_primary: boolean | null
          type: string
          value: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          is_primary?: boolean | null
          type: string
          value: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          is_primary?: boolean | null
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_identifier_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_identifier_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_full"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merge_log: {
        Row: {
          id: string
          merged_at: string | null
          merged_by: string | null
          primary_customer_id: string
          secondary_customer_id: string
        }
        Insert: {
          id?: string
          merged_at?: string | null
          merged_by?: string | null
          primary_customer_id: string
          secondary_customer_id: string
        }
        Update: {
          id?: string
          merged_at?: string | null
          merged_by?: string | null
          primary_customer_id?: string
          secondary_customer_id?: string
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
          source: string | null
          total_seguidores: number | null
          unfollows: number | null
          upload_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          novos_seguidores?: number | null
          source?: string | null
          total_seguidores?: number | null
          unfollows?: number | null
          upload_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          novos_seguidores?: number | null
          source?: string | null
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
      ga4_behavior: {
        Row: {
          avg_session_duration: number | null
          bounce_rate: number | null
          created_at: string | null
          date: string
          dimension_type: string
          dimension_value: string
          id: number
          new_users: number | null
          pages_per_session: number | null
          sessions: number | null
          transactions: number | null
          users: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          date: string
          dimension_type: string
          dimension_value: string
          id?: number
          new_users?: number | null
          pages_per_session?: number | null
          sessions?: number | null
          transactions?: number | null
          users?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          date?: string
          dimension_type?: string
          dimension_value?: string
          id?: number
          new_users?: number | null
          pages_per_session?: number | null
          sessions?: number | null
          transactions?: number | null
          users?: number | null
        }
        Relationships: []
      }
      ga4_products: {
        Row: {
          created_at: string | null
          date: string
          id: number
          item_name: string
          item_revenue: number | null
          items_added_to_cart: number | null
          items_purchased: number | null
          items_viewed: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: number
          item_name: string
          item_revenue?: number | null
          items_added_to_cart?: number | null
          items_purchased?: number | null
          items_viewed?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: number
          item_name?: string
          item_revenue?: number | null
          items_added_to_cart?: number | null
          items_purchased?: number | null
          items_viewed?: number | null
        }
        Relationships: []
      }
      ga4_sessions: {
        Row: {
          add_to_carts: number | null
          checkouts: number | null
          created_at: string | null
          date: string
          id: number
          new_users: number | null
          purchase_revenue: number | null
          sessions: number | null
          source_medium: string
          transactions: number | null
          users: number | null
        }
        Insert: {
          add_to_carts?: number | null
          checkouts?: number | null
          created_at?: string | null
          date: string
          id?: number
          new_users?: number | null
          purchase_revenue?: number | null
          sessions?: number | null
          source_medium: string
          transactions?: number | null
          users?: number | null
        }
        Update: {
          add_to_carts?: number | null
          checkouts?: number | null
          created_at?: string | null
          date?: string
          id?: number
          new_users?: number | null
          purchase_revenue?: number | null
          sessions?: number | null
          source_medium?: string
          transactions?: number | null
          users?: number | null
        }
        Relationships: []
      }
      influencer_posts: {
        Row: {
          comments: number | null
          coupon: string | null
          created_at: string | null
          id: string
          influencer_instagram: string | null
          influencer_name: string
          likes: number | null
          notes: string | null
          platform: string | null
          post_type: string | null
          post_url: string
          published_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          comments?: number | null
          coupon?: string | null
          created_at?: string | null
          id?: string
          influencer_instagram?: string | null
          influencer_name: string
          likes?: number | null
          notes?: string | null
          platform?: string | null
          post_type?: string | null
          post_url: string
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          comments?: number | null
          coupon?: string | null
          created_at?: string | null
          id?: string
          influencer_instagram?: string | null
          influencer_name?: string
          likes?: number | null
          notes?: string | null
          platform?: string | null
          post_type?: string | null
          post_url?: string
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      influencer_registry: {
        Row: {
          address_bairro: string | null
          address_cep: string | null
          address_cidade: string | null
          address_complemento: string | null
          address_estado: string | null
          address_logradouro: string | null
          address_numero: string | null
          cnpj: string | null
          coupon: string | null
          cpf: string | null
          created_at: string | null
          email: string
          id: string
          instagram: string | null
          name: string
          razao_social: string | null
          tiktok: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          cnpj?: string | null
          coupon?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          id?: string
          instagram?: string | null
          name?: string
          razao_social?: string | null
          tiktok?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          cnpj?: string | null
          coupon?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          id?: string
          instagram?: string | null
          name?: string
          razao_social?: string | null
          tiktok?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      influencer_sales: {
        Row: {
          coupon: string
          date_sale: string
          id: string
          imported_at: string | null
          order_id: string | null
          order_value: number | null
          payment_value: number | null
          products: string[] | null
        }
        Insert: {
          coupon: string
          date_sale: string
          id?: string
          imported_at?: string | null
          order_id?: string | null
          order_value?: number | null
          payment_value?: number | null
          products?: string[] | null
        }
        Update: {
          coupon?: string
          date_sale?: string
          id?: string
          imported_at?: string | null
          order_id?: string | null
          order_value?: number | null
          payment_value?: number | null
          products?: string[] | null
        }
        Relationships: []
      }
      instagram_comments: {
        Row: {
          categoria: string | null
          classified_at: string | null
          created_at: string | null
          id: string
          media_caption: string | null
          media_id: string
          media_permalink: string | null
          media_timestamp: string | null
          media_url: string | null
          oculto: boolean | null
          respondido: boolean | null
          resposta_texto: string | null
          resposta_timestamp: string | null
          risco: string | null
          risco_motivo: string | null
          sentimento: string | null
          text: string
          timestamp: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          categoria?: string | null
          classified_at?: string | null
          created_at?: string | null
          id: string
          media_caption?: string | null
          media_id: string
          media_permalink?: string | null
          media_timestamp?: string | null
          media_url?: string | null
          oculto?: boolean | null
          respondido?: boolean | null
          resposta_texto?: string | null
          resposta_timestamp?: string | null
          risco?: string | null
          risco_motivo?: string | null
          sentimento?: string | null
          text: string
          timestamp: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          categoria?: string | null
          classified_at?: string | null
          created_at?: string | null
          id?: string
          media_caption?: string | null
          media_id?: string
          media_permalink?: string | null
          media_timestamp?: string | null
          media_url?: string | null
          oculto?: boolean | null
          respondido?: boolean | null
          resposta_texto?: string | null
          resposta_timestamp?: string | null
          risco?: string | null
          risco_motivo?: string | null
          sentimento?: string | null
          text?: string
          timestamp?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      instagram_demographics: {
        Row: {
          breakdown_type: string
          breakdown_value: string
          count: number | null
          id: string
          synced_at: string | null
        }
        Insert: {
          breakdown_type: string
          breakdown_value: string
          count?: number | null
          id?: string
          synced_at?: string | null
        }
        Update: {
          breakdown_type?: string
          breakdown_value?: string
          count?: number | null
          id?: string
          synced_at?: string | null
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          caption: string | null
          comments: number | null
          engagements: number | null
          id: string
          impressions: number | null
          likes: number | null
          media_type: string | null
          permalink: string | null
          post_id: string
          post_type: string | null
          published_at: string | null
          reach: number | null
          saves: number | null
          shares: number | null
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          engagements?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_type?: string | null
          permalink?: string | null
          post_id: string
          post_type?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          comments?: number | null
          engagements?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_type?: string | null
          permalink?: string | null
          post_id?: string
          post_type?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_calendar: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_calendar_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketing_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      marketing_data: {
        Row: {
          created_at: string | null
          data: string
          id: string
          metrica: string | null
          source: string | null
          upload_id: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          metrica?: string | null
          source?: string | null
          upload_id?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          metrica?: string | null
          source?: string | null
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
      nf_extracted_data: {
        Row: {
          chave_acesso: string | null
          cliente_nome: string | null
          created_at: string
          id: string
          numero_nf: string | null
          numero_pedido_ref: string | null
          order_id: string
          produtos: Json | null
          raw_text: string | null
          serie: string | null
          valor_total: number | null
        }
        Insert: {
          chave_acesso?: string | null
          cliente_nome?: string | null
          created_at?: string
          id?: string
          numero_nf?: string | null
          numero_pedido_ref?: string | null
          order_id: string
          produtos?: Json | null
          raw_text?: string | null
          serie?: string | null
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string | null
          cliente_nome?: string | null
          created_at?: string
          id?: string
          numero_nf?: string | null
          numero_pedido_ref?: string | null
          order_id?: string
          produtos?: Json | null
          raw_text?: string | null
          serie?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nf_extracted_data_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "operational_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_order_items: {
        Row: {
          created_at: string
          id: string
          lote: string | null
          operational_order_id: string
          produto: string
          quantidade: number
          unidade: string
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          lote?: string | null
          operational_order_id: string
          produto: string
          quantidade?: number
          unidade?: string
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          lote?: string | null
          operational_order_id?: string
          produto?: string
          quantidade?: number
          unidade?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_order_items_operational_order_id_fkey"
            columns: ["operational_order_id"]
            isOneToOne: false
            referencedRelation: "operational_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_orders: {
        Row: {
          apelido: string | null
          boleto_file_path: string | null
          codigo_rastreio: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          destinatario_bairro: string | null
          destinatario_cep: string | null
          destinatario_cidade: string | null
          destinatario_documento: string | null
          destinatario_email: string | null
          destinatario_endereco: string | null
          destinatario_nome: string | null
          destinatario_telefone: string | null
          divergencia: Json | null
          documentos_atualizados_em: string | null
          forma_pagamento: string | null
          id: string
          is_fiscal_exempt: boolean
          lote: string | null
          medidas: string | null
          natureza_pedido: string
          nf_file_path: string | null
          nf_pendente: boolean | null
          numero_nf: string | null
          observacoes: string | null
          pedido_origem_id: string | null
          pedido_origem_tipo: string | null
          peso_total: number | null
          reconciliacao_status: string | null
          reconciliado: boolean
          responsavel: string | null
          status_operacional: string
          tipo_nf: string | null
          updated_at: string
          valor_total_informado: number
        }
        Insert: {
          apelido?: string | null
          boleto_file_path?: string | null
          codigo_rastreio?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          destinatario_bairro?: string | null
          destinatario_cep?: string | null
          destinatario_cidade?: string | null
          destinatario_documento?: string | null
          destinatario_email?: string | null
          destinatario_endereco?: string | null
          destinatario_nome?: string | null
          destinatario_telefone?: string | null
          divergencia?: Json | null
          documentos_atualizados_em?: string | null
          forma_pagamento?: string | null
          id?: string
          is_fiscal_exempt?: boolean
          lote?: string | null
          medidas?: string | null
          natureza_pedido?: string
          nf_file_path?: string | null
          nf_pendente?: boolean | null
          numero_nf?: string | null
          observacoes?: string | null
          pedido_origem_id?: string | null
          pedido_origem_tipo?: string | null
          peso_total?: number | null
          reconciliacao_status?: string | null
          reconciliado?: boolean
          responsavel?: string | null
          status_operacional?: string
          tipo_nf?: string | null
          updated_at?: string
          valor_total_informado?: number
        }
        Update: {
          apelido?: string | null
          boleto_file_path?: string | null
          codigo_rastreio?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          destinatario_bairro?: string | null
          destinatario_cep?: string | null
          destinatario_cidade?: string | null
          destinatario_documento?: string | null
          destinatario_email?: string | null
          destinatario_endereco?: string | null
          destinatario_nome?: string | null
          destinatario_telefone?: string | null
          divergencia?: Json | null
          documentos_atualizados_em?: string | null
          forma_pagamento?: string | null
          id?: string
          is_fiscal_exempt?: boolean
          lote?: string | null
          medidas?: string | null
          natureza_pedido?: string
          nf_file_path?: string | null
          nf_pendente?: boolean | null
          numero_nf?: string | null
          observacoes?: string | null
          pedido_origem_id?: string | null
          pedido_origem_tipo?: string | null
          peso_total?: number | null
          reconciliacao_status?: string | null
          reconciliado?: boolean
          responsavel?: string | null
          status_operacional?: string
          tipo_nf?: string | null
          updated_at?: string
          valor_total_informado?: number
        }
        Relationships: [
          {
            foreignKeyName: "operational_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_full"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          order_id: string
          payload: Json | null
          tipo_evento: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          payload?: Json | null
          tipo_evento: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          payload?: Json | null
          tipo_evento?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "operational_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_data: {
        Row: {
          canal: string | null
          cfop: string | null
          chave_acesso: string | null
          cidade: string | null
          cliente_email: string | null
          cliente_nome: string | null
          cpf_cnpj: string | null
          created_at: string | null
          cupom: string | null
          data_emissao_nf: string | null
          data_saida_nf: string | null
          data_venda: string
          estado: string | null
          fonte_dados: string | null
          forma_envio: string | null
          frete_por_conta: string | null
          id: string
          id_nota: string | null
          municipio: string | null
          natureza_operacao: string | null
          ncm: string | null
          numero_nota: string | null
          numero_pedido: string | null
          numero_pedido_plataforma: string | null
          observacoes_nf: string | null
          peso_bruto: number | null
          peso_liquido: number | null
          produtos: Json
          regime_tributario: string | null
          segmento_cliente: string | null
          serie: string | null
          status: string | null
          tipo_movimento: string | null
          total_faturado: number | null
          uf: string | null
          upload_id: string | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_nota: number | null
          valor_produtos: number | null
          valor_total: number
        }
        Insert: {
          canal?: string | null
          cfop?: string | null
          chave_acesso?: string | null
          cidade?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          cupom?: string | null
          data_emissao_nf?: string | null
          data_saida_nf?: string | null
          data_venda: string
          estado?: string | null
          fonte_dados?: string | null
          forma_envio?: string | null
          frete_por_conta?: string | null
          id?: string
          id_nota?: string | null
          municipio?: string | null
          natureza_operacao?: string | null
          ncm?: string | null
          numero_nota?: string | null
          numero_pedido?: string | null
          numero_pedido_plataforma?: string | null
          observacoes_nf?: string | null
          peso_bruto?: number | null
          peso_liquido?: number | null
          produtos: Json
          regime_tributario?: string | null
          segmento_cliente?: string | null
          serie?: string | null
          status?: string | null
          tipo_movimento?: string | null
          total_faturado?: number | null
          uf?: string | null
          upload_id?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_nota?: number | null
          valor_produtos?: number | null
          valor_total: number
        }
        Update: {
          canal?: string | null
          cfop?: string | null
          chave_acesso?: string | null
          cidade?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          cupom?: string | null
          data_emissao_nf?: string | null
          data_saida_nf?: string | null
          data_venda?: string
          estado?: string | null
          fonte_dados?: string | null
          forma_envio?: string | null
          frete_por_conta?: string | null
          id?: string
          id_nota?: string | null
          municipio?: string | null
          natureza_operacao?: string | null
          ncm?: string | null
          numero_nota?: string | null
          numero_pedido?: string | null
          numero_pedido_plataforma?: string | null
          observacoes_nf?: string | null
          peso_bruto?: number | null
          peso_liquido?: number | null
          produtos?: Json
          regime_tributario?: string | null
          segmento_cliente?: string | null
          serie?: string | null
          status?: string | null
          tipo_movimento?: string | null
          total_faturado?: number | null
          uf?: string | null
          upload_id?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_nota?: number | null
          valor_produtos?: number | null
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
      sales_data_log: {
        Row: {
          arquivo_nome: string | null
          id_log: string
          id_original: string
          motivo: string | null
          numero_nota: string | null
          numero_pedido: string | null
          payload_completo: Json
          serie: string | null
          substituido_em: string
          upload_id: string | null
          usuario_id: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          id_log?: string
          id_original: string
          motivo?: string | null
          numero_nota?: string | null
          numero_pedido?: string | null
          payload_completo: Json
          serie?: string | null
          substituido_em?: string
          upload_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          id_log?: string
          id_original?: string
          motivo?: string | null
          numero_nota?: string | null
          numero_pedido?: string | null
          payload_completo?: Json
          serie?: string | null
          substituido_em?: string
          upload_id?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      upload_history: {
        Row: {
          created_at: string
          data_type: string
          date_range_end: string | null
          date_range_start: string | null
          file_name: string | null
          id: string
          pedidos_substituidos: string[] | null
          record_count: number
          registros_substituidos: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data_type: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_name?: string | null
          id?: string
          pedidos_substituidos?: string[] | null
          record_count?: number
          registros_substituidos?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_name?: string | null
          id?: string
          pedidos_substituidos?: string[] | null
          record_count?: number
          registros_substituidos?: number | null
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
      customer_full: {
        Row: {
          average_days_between_purchases: number | null
          churn_status: string | null
          cpf_cnpj: string | null
          created_at: string | null
          days_since_last_purchase: number | null
          first_order_date: string | null
          id: string | null
          is_active: boolean | null
          last_contact_date: string | null
          last_order_date: string | null
          merged_into: string | null
          nome: string | null
          observacoes: string | null
          prioridade: string | null
          recalculated_at: string | null
          responsavel: string | null
          segment: string | null
          status_manual: string | null
          tags: Json | null
          ticket_medio: number | null
          total_orders_all: number | null
          total_orders_revenue: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          average_days_between_purchases?: number | null
          churn_status?: never
          cpf_cnpj?: string | null
          created_at?: string | null
          days_since_last_purchase?: never
          first_order_date?: string | null
          id?: string | null
          is_active?: boolean | null
          last_contact_date?: string | null
          last_order_date?: string | null
          merged_into?: string | null
          nome?: string | null
          observacoes?: string | null
          prioridade?: string | null
          recalculated_at?: string | null
          responsavel?: string | null
          segment?: string | null
          status_manual?: string | null
          tags?: Json | null
          ticket_medio?: number | null
          total_orders_all?: number | null
          total_orders_revenue?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          average_days_between_purchases?: number | null
          churn_status?: never
          cpf_cnpj?: string | null
          created_at?: string | null
          days_since_last_purchase?: never
          first_order_date?: string | null
          id?: string | null
          is_active?: boolean | null
          last_contact_date?: string | null
          last_order_date?: string | null
          merged_into?: string | null
          nome?: string | null
          observacoes?: string | null
          prioridade?: string | null
          recalculated_at?: string | null
          responsavel?: string | null
          segment?: string | null
          status_manual?: string | null
          tags?: Json | null
          ticket_medio?: number | null
          total_orders_all?: number | null
          total_orders_revenue?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "customer_full"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bulk_update_effective_status:
        | {
            Args: { updates: Json }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.bulk_update_effective_status(updates => jsonb), public.bulk_update_effective_status(updates => _jsonb). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { updates: Json[] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.bulk_update_effective_status(updates => jsonb), public.bulk_update_effective_status(updates => _jsonb). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      expire_old_decisions: { Args: never; Returns: number }
      find_customer_by_identifier: {
        Args: { p_value: string }
        Returns: {
          average_days_between_purchases: number | null
          cpf_cnpj: string
          created_at: string | null
          first_order_date: string | null
          id: string
          is_active: boolean
          journey_stage: string | null
          last_contact_date: string | null
          last_order_date: string | null
          merged_into: string | null
          nome: string | null
          observacoes: string | null
          prioridade: string | null
          recalculated_at: string | null
          responsavel: string | null
          segment: string | null
          status_manual: string | null
          tags: Json | null
          ticket_medio: number | null
          total_orders_all: number
          total_orders_revenue: number
          total_revenue: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_first_user: { Args: never; Returns: boolean }
      merge_customers: {
        Args: { p_primary: string; p_secondary: string }
        Returns: undefined
      }
      nf_snapshot_and_purge: {
        Args: {
          p_arquivo_nome: string
          p_numero_pedidos: string[]
          p_upload_id: string
          p_usuario_id: string
        }
        Returns: number
      }
      recalculate_all_customers: { Args: never; Returns: number }
      recalculate_customer: { Args: { p_cpf_cnpj: string }; Returns: undefined }
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
