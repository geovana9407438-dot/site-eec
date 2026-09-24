import type { Context } from 'hono'
import { createHonoSupabaseClient } from '../lib/supabase'
import type { AuthUser } from '../types/auth'
import { createComunicadoSchemas } from '../schemas/comunicado.schema'
import {
    archiveUserComunicado,
    createUserComunicado,
    getComunicado,
    listUserComunicados,
    publishUserComunicado
} from '../services/comunicado.service'
import { HttpError } from '../errors/http-error'

export async function listComunicadosHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)

    const comunicados = await listUserComunicados(user, client)
    return c.json({ success: true, data: comunicados })
}

export async function getComunicadoHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const user = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de comunicado inválido.')
    }

    const comunicado = await getComunicado(id, user, client)
    return c.json({ success: true, data: comunicado })
}

export async function createComunicadoHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)

    const body = await c.req.json().catch(() => null)
    if (!body) {
        throw new HttpError(400, 'Corpo da requisição inválido.')
    }

    const parseResult = createComunicadoSchemas.safeParce(body)
    if (!parseResult.success) {
        const errorMsg = parseResult.error.issues.map((i: { message: string}) => i.message).join(',')
        throw new HttpError(400, `Dados inválidos: ${errorMsg}`)
    }

    const created = await createUserComunicado(parseResult.data, user, client)
    return c.json({ success: true, data: created }, 201)
}

export async function publishComunicadoHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de comunicado inválido.')
    }

    await publishUserComunicado(id, user, client)
    return c.json({ success: true, message: 'Comunicado publicado com sucesso.'})
}

export async function archiveComunicadoHandle(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de comunicado inválido.')
    }

    await archiveUserComunicado(id, user, client)
    return c.json({ success: true, message: 'Comunicado arquivado com sucesso.'})
}