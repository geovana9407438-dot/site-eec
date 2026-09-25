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
}