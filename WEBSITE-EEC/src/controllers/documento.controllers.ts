import type { Context } from 'hono'
import { createHonoSupabaseClient } from '../lib/supabase'
import type { AuthUser } from '../types/auth'
import {
    createCompartilhamentoSchema,
    rejeitarDocumentoSchema,
    uploadFinalizarSchema,
    uploadIntentSchema
} from '../schemas/documento.schema'
import {
    approveUserDocumento,
    archiveUserDocumento,
    createUploadIntentDocumento,
    finalizeDirectUploadDocumento,
    getDocumentoDownloadUrl,
    listUserDocumentos,
    rejectUserDocumento,
    shareUserDocumento,
    uploadUserDocumento
} from '../services/documento.service'
import { getLocalFileFromSignedRequest, saveLocalDirectUpload } from '../services/storage.service'
import { HttpError } from '../errors/http-error'

export async function listDocumentosHandle(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)

    const docs = await listUserDocumentos(user, client)
    return c.json({ success: true, data: docs })
}

export async function uploadDocumentoHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)

    const body = await c.req.parseBody().catch(() => null)
    if (!body || !body['arquivo']) {
        throw new HttpError(400, 'Nenhum arquivo enviado no campo "arquivo".')
    }

    const file = body['arquivo']
    if(typeof file === 'string' || !(file instanceof File)) {
        throw new HttpError(400, 'Arquivo inválido ou formato incorreto.')
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const categoria = typeof body['categoria'] === 'string' ? body['categoria'] : 'pedagogico'

    const doc = await uploadUserDocumento({
        fileName: file.name,
        fileBuffer,
        mimeType: file.type || 'application/actet-stream',
        categoria
    }.user.client)

    return c.json({ success: true, data: doc }, 201)
}

export async function getDowloadUrlHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de documento inválido.')
    }

    const result = await getDocumentoDownloadUrl(id, user, client)
    return c.json({ success: true, ...result })
}

export async function approveDocumentoHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de documento inválido.')
    }

    await approveUserDocumento(id, user, client)
    return c.json({ success: true, message: 'Documento aprovado com sucesso.'})
}

export async function rejectDocumentoHandle(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de documento inválido.')
    }

    const body = await c.req.json().catch(() => null)
    const parseResult = rejeitarDocumentoSchema.safeParse(body)
    if (!parseResult.success) {
        throw new HttpError(400, 'Motivo da rejeição é obrigatório e deve ter ao menos 5 caracteres.')
    }

    await rejectUserDocumento(id, parseResult.data.motivo, user, client)
    return c.json({ success: true, message: 'Documento rejeitado.' })
}

export async function archiveDocumentoHandle(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de documento inválido.')
    }

    await archiveUserDocumento(id, user, client)
    return c.json({ success: true, message: 'Documento arquivado com sucesso.' })
}

export async function shareDocumentoHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)
    const id = parseInt(c.req.param('id'), 10)

    if (isNaN(id)) {
        throw new HttpError(400, 'Identificador de documento inválido.')
    }

    const body = await c.req.json().catch(() => null)
    const parseResult = createCompartilhamentoSchema.safeParse(body)
    if (!parseResult.success) {
        const errorMsg = parseResult.error.issues.map((i: { message: string}) => i.message).join(',')
        throw new HttpError(400, `Dados de compartilhamento inválidos: ${errorMsg}`)
    }

    await shareUserDocumento(id, parseResult.data, user, client)
    return c.json({ success: true, message: 'Documento compartilhado com sucesso.' })
}

export async function DowloadLocalFileHandler(c: Context) {
    const path = c.req.query('path') || ''
    const expires = c.req.query('expires') || ''
    const sig = c.req.query('sig') || ''

    if (!path || !expires || !sig) {
        throw new HttpError(400, 'Parâmetros de assinatura incompletos.')
    }

    const file = getLocalFileFromSignedRequest(path, expires, sig)

    c.header('Content-Type', file.mimeType)
    c.header('Content-Disposition', 'attachment')
    c.header('Content-Control', 'private, no-cache, no-store, must-revalidate')
    return c.body(new Uint8Array(file.buffer))
}

export async function uploadIntentHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)

    const body = await c.req.json().catch(() => null)
    const parseResult = uploadIntentSchema.safeParse(body)
    if (!parseResult.success) {
        const errorMsg = parseResult.error.issues.map((i: { message: string}) => i.message).join(',')
        throw new HttpError(400, `Dados de intent de upload inválidos: ${errorMsg}`)
    }

    const intent = await createUploadIntentDocumento(parseResult.data, user, client)
    return c.json({ success: true, data: intent })
}

export async function uploadFinalizarHandler(c: Context) {
    const user = c.get('user') as AuthUser
    const client = createHonoSupabaseClient(c)

    const body = await c.req.json().catch(() => null)
    const parseResult = uploadFinalizarSchema.safeParse(body)
    if (!parseResult.success) {
        const errorMsg = parseResult.error.issues.map((i: { message: string}) => i.message).join(',')
        throw new HttpError(400, `Dados de finalização de upload inválidos: ${errorMsg}`)
    }

    const doc = await finalizeDirectUploadDocumento(parseResult.data, user, client)
    return c.json({ success: true, data: doc }, 201)
}

export async function DirectUploadLocalHandler(c: Context) {
    const path = c.req.query('path') || ''
    const expires = c.req.query('expires') || ''
    const sig = c.req.query('sig') || ''

    if (!path || !expires || !sig) {
        throw new HttpError(400, 'Parâmetros de assinatura incompletos.')
    }

    const expiresNum = parseInt(expires, 10)
    if (isNaN(expiresNum) || Date.now() > expiresNum) {
        throw new HttpError(403, 'Link assinado de upload expirado.')
    }

    const rawbody = await c.req.arrayBuffer()
    const contentType =  c.req.header('content-type') || 'application/octet-stream'

    saveLocalDirectUpload(path, Buffer.from(rawbody), contentType)
    return c.json({ success: true, message: 'Upload direto local concluído com sucesso.'})
}