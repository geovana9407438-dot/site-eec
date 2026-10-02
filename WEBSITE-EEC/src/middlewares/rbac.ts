import type { Context, Next } from 'hono' /**imporar dois tipos do hono. Ex. Context (representa a requisição e a resposta atual) e Next(representa o próximo middleware ou controller que deve ser executada) */
import type { Role } from '../types/auth'/** Importa o tipo Role, que representa os papeis permitidos pelo sistema */
import { assertUrl } from '../utils/assets'/** Importa uma função que monta a URL correta dos arquivos estáticos, como CSS */

/**
 * Middleware RBAC (Role-Based Access Control).
 * Garante que apenas usuários com perfis autorizados acessem o recurso.
 * O papel `super_admin` possui acesso universal a todas as funções dentro do escopo da Central EEC.
 */
export function requireRole(...allowedRoles: Role[]) { /**Crie uma proteção que permita acesso apenas aos pápeis informados */
    return async (c: Context, next: Next) => {
        const user = c.get('user')
        const role = c.get('role')

        if(!user || !role) {
            return c.json({ error: 'Acesso restrito: usuário sem perfil homologado.' }, 403)
        }

        //  super admin possui acesso universal a todos os módulos autorizados
        if(role === 'super_admin') {
            return await next ()
        }

        if (allowedRoles.includes(role)) {
            return await next()
        }

        const accept = c.req.header('Accept') || ''
        if(accept.includes('text/html')) {
            return c.html(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>403 - Acesso Negado | Central EEC</title>
                    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <link rel="stylesheet" href="${assertUrl('/styles/tailwind.css')}">
                </head>
                <body class="font-poppins bg-gray-100 flex items-center justify-center min-h-screen p-4">
                    <div class="max-w-md w-full bg 
            `)
        }
    }
}