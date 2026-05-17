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
      leads: {
        Row: {
          id: string;
          nome: string | null;
          telefone: string;
          canal: string;
          status: string;
          criado_em: string;
          atualizado_em: string;
          origem_contato: string;
          foto_url: string | null;
          ia_pausada: boolean;
          pausada_em: string | null;
          pausada_por: string | null;
          motivo_pausa: string | null;
          segmento: string | null;
          followup_optout: boolean;
          cadencia_dias: number | null;
          segmento_calculado_em: string | null;
          analise_motivo: string | null;
          analise_confianca: number | null;
          analise_recomendacao: string | null;
          analise_resumo: string | null;
          analise_calculada_em: string | null;
          score: number;
          score_breakdown: Json | null;
          score_atualizado_em: string | null;
          status_atividade: "ativa" | "dormente" | "perdida";
          status_transicao_em: string | null;
        };
        Insert: {
          id?: string;
          nome?: string | null;
          telefone: string;
          canal?: string;
          status?: string;
          criado_em?: string;
          atualizado_em?: string;
          origem_contato?: string;
          foto_url?: string | null;
          ia_pausada?: boolean;
          pausada_em?: string | null;
          pausada_por?: string | null;
          motivo_pausa?: string | null;
          segmento?: string | null;
          followup_optout?: boolean;
          cadencia_dias?: number | null;
          segmento_calculado_em?: string | null;
          analise_motivo?: string | null;
          analise_confianca?: number | null;
          analise_recomendacao?: string | null;
          analise_resumo?: string | null;
          analise_calculada_em?: string | null;
          score?: number;
          score_breakdown?: Json | null;
          score_atualizado_em?: string | null;
          status_atividade?: "ativa" | "dormente" | "perdida";
          status_transicao_em?: string | null;
        };
        Update: {
          id?: string;
          nome?: string | null;
          telefone?: string;
          canal?: string;
          status?: string;
          criado_em?: string;
          atualizado_em?: string;
          origem_contato?: string;
          foto_url?: string | null;
          ia_pausada?: boolean;
          pausada_em?: string | null;
          pausada_por?: string | null;
          motivo_pausa?: string | null;
          segmento?: string | null;
          followup_optout?: boolean;
          cadencia_dias?: number | null;
          segmento_calculado_em?: string | null;
          analise_motivo?: string | null;
          analise_confianca?: number | null;
          analise_recomendacao?: string | null;
          analise_resumo?: string | null;
          analise_calculada_em?: string | null;
          score?: number;
          score_breakdown?: Json | null;
          score_atualizado_em?: string | null;
          status_atividade?: "ativa" | "dormente" | "perdida";
          status_transicao_em?: string | null;
        };
        Relationships: [];
      };
      agendamentos: {
        Row: {
          id: string;
          lead_id: string | null;
          servico: string | null;
          data_agendamento: string | null;
          status: string;
          criado_em: string;
          origem: string;
          valor: number | null;
          confirmacao_enviada: boolean;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          servico?: string | null;
          data_agendamento?: string | null;
          status?: string;
          criado_em?: string;
          origem?: string;
          valor?: number | null;
          confirmacao_enviada?: boolean;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          servico?: string | null;
          data_agendamento?: string | null;
          status?: string;
          criado_em?: string;
          origem?: string;
          valor?: number | null;
          confirmacao_enviada?: boolean;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          lead_id: string;
          agendamento_id: string | null;
          mensagem: string | null;
          status: string;
          enviado_em: string;
          tentativa: number;
          template_id: string | null;
          converteu: boolean;
          convertido_em: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          agendamento_id?: string | null;
          mensagem?: string | null;
          status?: string;
          enviado_em?: string;
          tentativa?: number;
          template_id?: string | null;
          converteu?: boolean;
          convertido_em?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          agendamento_id?: string | null;
          mensagem?: string | null;
          status?: string;
          enviado_em?: string;
          tentativa?: number;
          template_id?: string | null;
          converteu?: boolean;
          convertido_em?: string | null;
        };
        Relationships: [];
      };
      followup_templates: {
        Row: {
          id: string;
          segmento: string;
          tentativa: number;
          mensagem: string;
          ativo: boolean;
          criado_em: string;
          qtd_envios: number;
          qtd_conversoes: number;
          ultimo_envio_em: string | null;
        };
        Insert: {
          id?: string;
          segmento: string;
          tentativa?: number;
          mensagem: string;
          ativo?: boolean;
          criado_em?: string;
          qtd_envios?: number;
          qtd_conversoes?: number;
          ultimo_envio_em?: string | null;
        };
        Update: {
          id?: string;
          segmento?: string;
          tentativa?: number;
          mensagem?: string;
          ativo?: boolean;
          criado_em?: string;
          qtd_envios?: number;
          qtd_conversoes?: number;
          ultimo_envio_em?: string | null;
        };
        Relationships: [];
      };
      servicos: {
        Row: {
          id: string;
          nome: string;
          preco: number;
          duracao_minutos: number;
          ativo: boolean;
          criado_em: string;
          categoria: string | null;
          descricao: string | null;
          indicado_para: string | null;
          beneficios: Json;
          contraindicacoes: string | null;
          recuperacao_dias: number;
          sessoes_recomendadas: number;
          preco_pacote: number | null;
          observacoes: string | null;
          ordem_exibicao: number;
        };
        Insert: {
          id?: string;
          nome: string;
          preco: number;
          duracao_minutos?: number;
          ativo?: boolean;
          criado_em?: string;
          categoria?: string | null;
          descricao?: string | null;
          indicado_para?: string | null;
          beneficios?: Json;
          contraindicacoes?: string | null;
          recuperacao_dias?: number;
          sessoes_recomendadas?: number;
          preco_pacote?: number | null;
          observacoes?: string | null;
          ordem_exibicao?: number;
        };
        Update: {
          id?: string;
          nome?: string;
          preco?: number;
          duracao_minutos?: number;
          ativo?: boolean;
          criado_em?: string;
          categoria?: string | null;
          descricao?: string | null;
          indicado_para?: string | null;
          beneficios?: Json;
          contraindicacoes?: string | null;
          recuperacao_dias?: number;
          sessoes_recomendadas?: number;
          preco_pacote?: number | null;
          observacoes?: string | null;
          ordem_exibicao?: number;
        };
        Relationships: [];
      };
      clinica_info: {
        Row: {
          id: string;
          nome_clinica: string;
          proprietario_nome: string | null;
          endereco: string | null;
          bairro: string | null;
          cidade: string | null;
          estado: string | null;
          cep: string | null;
          telefone: string | null;
          whatsapp: string | null;
          email: string | null;
          instagram: string | null;
          horario_funcionamento: Json | null;
          formas_pagamento: Json | null;
          politica_cancelamento: string | null;
          diferenciais: string | null;
          observacoes_gerais: string | null;
          ativo: boolean;
          atualizado_em: string | null;
        };
        Insert: {
          id?: string;
          nome_clinica: string;
          proprietario_nome?: string | null;
          endereco?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          instagram?: string | null;
          horario_funcionamento?: Json | null;
          formas_pagamento?: Json | null;
          politica_cancelamento?: string | null;
          diferenciais?: string | null;
          observacoes_gerais?: string | null;
          ativo?: boolean;
          atualizado_em?: string | null;
        };
        Update: {
          id?: string;
          nome_clinica?: string;
          proprietario_nome?: string | null;
          endereco?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          instagram?: string | null;
          horario_funcionamento?: Json | null;
          formas_pagamento?: Json | null;
          politica_cancelamento?: string | null;
          diferenciais?: string | null;
          observacoes_gerais?: string | null;
          ativo?: boolean;
          atualizado_em?: string | null;
        };
        Relationships: [];
      };
      conversas: {
        Row: {
          id: string;
          lead_id: string;
          mensagem: string;
          origem: "cliente" | "agente";
          enviado_em: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          mensagem: string;
          origem: "cliente" | "agente";
          enviado_em?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          mensagem?: string;
          origem?: "cliente" | "agente";
          enviado_em?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      recalcular_score_lead: {
        Args: { p_lead_id: string };
        Returns: number;
      };
      recalcular_status_atividade_lead: {
        Args: { p_lead_id: string };
        Returns: string;
      };
      atualizar_lead_score_status: {
        Args: { p_lead_id: string };
        Returns: undefined;
      };
      incrementar_envios_template: {
        Args: { p_template_id: string };
        Returns: undefined;
      };
      incrementar_conversoes_template: {
        Args: { p_template_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
};

/* ── Aliases convenientes ── */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
