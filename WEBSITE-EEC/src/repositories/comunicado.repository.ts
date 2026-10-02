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
            .select('*')
            .order('id', { ascending: false })

        if (error) {
            throw new Error(`Erro ao consultar comunicados no Supabase: ${error.message}`)
        }

        return (data || []) as ComunicadoRecord[]
    }

    // 2. Em ambiente local / testes isolados (SQLite): aplica as mesma regras de visibilidade
    const db = getDatabase()

    if (userRole === 'super_admin' || userRole === 'admin') {
        const stmt = db.prepare('SELECT * FROM comunicados ORDER BY id DESC')
        return (stmt.all() as unknown) as ComunicadoRecord[]
    }

    if (userRole === 'secretaria') {
        const stmt = db.prepare(`
            SELECT * FROM comunicados
            WHERE (status = 'publicado' AND audiencia IN ('todos_internos', 'admin_secretaria'))
                OR (criado_por = ?)
            ORDER BY ID DESC
        `)
        return (stmt.all(userId || '') as unknown) as ComunicadoRecord[]
    }

    if (userRole === 'docente') {
        const stmt = db.prepare(`
            SELECT * FROM comunicados
            WHERE (status = 'publicado' AND audiencia IN ('todos_internos', 'docentes'))
                OR (criado_por = ?)
            ORDER BY ID DESC
        `)
        return (stmt.all(userId || '') as unknown) as ComunicadoRecord[]
    }

    if (userRole === 'admin_tecnico') {
        const stmt = db.prepare(`
            SELECT * FROM comunicados
            WHERE status = 'publicado' AND audiencia IN ('todos_internos', 'admin_tecnico')
            ORDER BY ID DESC
        `)
        return (stmt.all() as unknown) as ComunicadoRecord[]
    }

    return [] 
}

export async function findComunicadoById(
    id: number,
    client?: SupabaseClient | null
): Promise<ComunicadoRecord | null> {
    if (client) {
        const { data, error } = await client
        .from('comunicados')
        .select('*')
        .eq('id', id)
        .maybeSingle()

        if (error) {
            throw new Error(`Erro ao bucar comunicado: ${error.message}`)
        }

        return (data as ComunicadoRecord) || null
    }

    const db = getDatabase()
}