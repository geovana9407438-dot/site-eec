import type { SupabaseClient } from '@supabase/supabase-js'
import { getDatabase } from '../database/connection'

export interface ComunicadoRecord {
    id: number
    titulo: string
    conteudo: string
    status: 'rascunho' | 'publicado' | 'arquivado'
    audiencia: 'todos_internos' | 'admin_secretaria' | 'docentes' | 'admin_tecnico'
    criado_por: string
    publicado_em: string | null
    arquivado_em: string | null
    created_at: string
    updated_at: string
}

export interface CreateComunicadoDTO {
    titulo: string
    conteudo: string
    status: 'rascunho' | 'publicado' | 'arquivado'
    audiencia: 'todos_internos' | 'admin_secretaria' | 'docentes' | 'admin_tecnico'
    criado_por: string
    publicado_em?: string | null
}

export async function listComunicados(
    cliente?: SupabaseClient | null,
    userRole?: string,
    userId?: string
): Promise<ComunicadoRecord[]> {
    // 1. Em ambiente Cloud / Produção: consulta via cliente supabase (RLS ativo)
    if (cliente) {
        const  {data, error } = await client 
        .from('comunicados')
    }
}