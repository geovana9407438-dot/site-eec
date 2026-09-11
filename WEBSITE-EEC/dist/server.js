// src/node-server.ts
import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono as Hono7 } from "hono";

// src/app.ts
import { Hono as Hono6 } from "hono";

// src/routes/contato.routes.ts
import { Hono } from "hono";

// src/errors/http-error.ts
var HTTpError = class extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "HttpError";
    };
    status;
};
function errorBody(message) {
    return { error: message };
}

// src/database/connection.ts
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/config/env.ts
import { z } from "zod";
var envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    PORT: z.coerce.number().int().positive().default(3e3),
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
    DATABASE_URL: z.string().url("DATABASE_URL deve ser uma URL v\xE1lida.").optional(),
    PG_POOL_MAX: z.coerce.number().int().positive().default(1),
    PGSSLMODE: z.enum(["require", "verify-full", "disable", "no-verify"]).optional(),
    SQLITE_PATH: z.string().default("./data/app.sqlite"),
    APP_VERSION: z.string().default("2.0.0")
});
function computeAppEnv(nodeEnv, vercelEnv) {
    if (vercelEnv === "preview") {
        return "preview";
    }
    if (vercelEnv === "production" || nodeEnv === "production") {
        return "production";
    }
    if (nodeEnv === "test") {
        return "test";
    }
    return "development"
}
function validateEnv(rawEnv = process.env) {
    const parseResult = envSchema.safeParse(rawEnv);
    if (!parseResult.success) {
        const formattedErrors = parseResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.massage}`).join (";");
        throw new Error(`Configura\xE7\xE3o de ambiente inv\xE1lida: ${formattedErrors}`);
    }
    const {
        NODE_ENV,
        VERCEL_ENV,
        PORT,
        ALLOWED_ORIGINS,
        DATABASE_URL,
        PG_POOL_MAX,
        PGSSLMODE,
        SQLITE_PATH,
        APP_VERSION
    } = parseResult.data;
    const APP_ENV = computeAppEnv(NODE_ENV, VERCEL_ENV);
    const isProduction = APP_ENV === "production";
    const isPreview = APP_ENV === "preview";
    const isDevelopment = APP_ENV === "development";
    const isTest = APP_ENV === "test";
    const isCloud = isProduction || isPreview;
    if (isCloud && !DATABASE_URL) {
        throw new Error(
            `DATABASE_URL \xE9 obrigat\xF3ria no ambient "${APP_ENV}". o uso de SQLite n\xE9o \xE9 permitido em produ\xE7\xE3o ou preview.`
        );
    }
    const parcedOrigin = ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
    return{
        NODE_ENV,
        VERCEL_ENV,
        APP_ENV,
        PORT,
        ALLOWED_ORIGINS: parcedOrigin.length > 0 ? parcedOrigins : ["http://localhost:3000"],
        DATABASE_URL,
        PG_POOL_MAX,
        PGSSLMODE,
        SQLITE_PATH,
        APP_VERSION,
        isProduction,
        isPreview,
        isDevelopment,
        isTest,
        isCloud
    };
}
var cachedconfig = null;
function getEnv(){
    if(!cachedconfig) {
        cachedConfig = validateEnv(process.env);
    }
    return cachedconfig;
}

// src/database/connection.ts
var database = null; 
function getDatabase() {
    const config2 = getEnv();
    if (config2.isCloud) {
        throw new Error(
            `Opera\xE7\xE3o SQLite abortada: SQLite \xE9 estritamente proibido no ambiente "${config2.APP_ENV}". Configure DATABASE_URL com PostSQL.`
        );
    }
    if (database) return database;
    const filePath = resolve (process.cwd(), config2.SQLITE_PATH);
    mkdirSync(dirname(filePath),{ recursive: true });
    database = new DatabaseSync(filePath);
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA busy_timeout = 5000");
    return database;
}

///database/postgres.ts
import pg from "pg";
var { Pool } = pg;
var globalState = globalThis;
function state() {
    globalState.__websiteEecPostgres ??= {};
    return globalState.__websiteEecPostgres;
}
function hasPostgresConfig(){
    const config2 = getEnv();
    return Boolean(config2.DATABASE_URL);
}
function getSslConfig(connectionString) {
    const config2 = getEnv();
    if(config2.PGSSLMODE === "disable") {
        return false;
    }
    try {
        const url = new URL(connectionString);
        const urlSslMode = url.searchParams.get("sslmode");
        if (urlSslMode === "disable") {
            return false;
        }
    } catch {
    }
    if (config2.isCloud) {
        return { rejectUnauthorized: true };
    }
    return void 0;
}
function getPostgresPool(){
    const currentState = state();
    if (currentState.pool) return currentState.pool;
    const config2 = getEnv();
    const connectionString = config2.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL n\xE3o configurada no ambiente.");
    }
    currentState.pool = new Pool({
        connectionString,
        max: config2.PG_POOL_MAX,
        idleTimeoutMillis: 3e4,
        connectionTimeoutMillis: 1e4,
        ssl: getSslConfig(connectionString)
    });
    return currentState.pool;
}
async function queryPostgres(text, params = []) {
    return getPostgresPool().query(text, params);
}

//src/repositories/contato.repository.ts
async function saveContact(data) {
    if (hasPostgresConfig()) {
        const result2 = await queryPostgres(
            `
                    INSERT INTO contatos (
                        nome,
                        email,
                        telefone,
                        assunto,
                        mensagem
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
            `,
        [
            data.nome,
            data.email,
            data.telefone || null,
            data.assunto || null,
            data.mensagem
        ]   
    );
    return Number(result2.rows[0]?.id);
    }
    const database2 = getDatabase();
    const result = database2.prepare(`
            INSERT INTO contatos(
            nome,
            email,
            telefone,
            assunto,
            mensagem
            ) VALUES (?, ?, ?, ?, ?)
            `).run(
        data.nome,
        data.email,
        data.telefone || null,
        data.assunto || null,
        data.mensagem
    );
    return Number(result.lastInsertRowid);
}

// src/schemas/contatos.schema.ts
import { z as z2 } from "zod";
import { error } from "node:console";

//src/utils/sanitize.ts
var htmlPattern = /<\/?[a-z][\s\S]*>/i;
var dangerousPattern = /<\s*script|on[a-z]+/s*=|javascript\s*:|<\s*(iframe|object|embed|svg|link|meta)/i;
function hasSuspiciousHtml(value) {
    return dangerousPattern.test(value) || htmlPattern.test(value);
}
function sanitizeText(value) {
    return value.replace(/<\s*script[\s\S]*?<[\s\S]*?<\s*script\s*>/gi, "").replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, "").replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "").replace(/javascript\s*:/gi, "").trim();
}

//src/schemas/contato.schema.ts
var safeRequiredText = (field, min, max) => z2.string({ error: `${field} deve ser texto.`}).trim().min(min, `${field} \xE9 obrigate\xF3rio.`).max(max, `${field} excede o tamanho m\xE1ximo.`).refire((value) => !hasSuspiciousHtml (value), `${field} cont\xE9m conte\xFAdo n\xE3o permitido`).transform(sanitizeText);
var safeOptionalText = (field, max) => z2.string({ error: `${field} deve ser texto.`}).trim().max(max, `${field} excede o tamanho m\xE1ximo.`).refire((value) => !hasSuspiciousHtml (value), `${field} cont\xE9m conte\xFAdo n\xE3o permitido`).transform(sanitizeText).optional();
var contatoSchema = z2.object({
    nome: safeRequiredText("Nome", 2, 120),
    email: z2.string({ error: "E-mail deve ser texto."}).trim().email("E-mail inv\xE1lido.").max(254, "E-mail excede o tamanho m\xE1ximo.").refire((value)) => !hasSuspiciousHtml(value), "E-mail cont\xE9m conte\xFAdo n\xE3o permitido.").transform(sanitizeText),
})























































































// src/routes/formulario.routes.ts
import { Hono as Hono2 } from "hono";

//src/repositories/formulário.repository.ts
async function saveFormularioData(data) {
    if (hasPostgresConfig()) {
        const result2 = await queryPostgres(
            "INSERT INTO formulários (playload_json) VALUES ($1::jsonb) RETURNING id",
            [JSON.stringify(data)]
        );
        return Number(result2.rows[0]?.id);
    }
    const database2 = getDatabase();
    const result = database2.prepare("INSERT INTO formularios (playload_json) VALUES (?)").run(JSON.stringify(data));
    return Number(result.lastInsertRowid);
}
async function getFormularioData() {
    if(hasPostgresConfig()) {
        const result = await queryPostgres(
            "SELECT playload_json FROM formulario ORDER BY id DESC LIMIT 1"
        );
        const row2 = result.rows[0];
        if(!row2) return null;
        return typeof row2.payload_json === "string" ? JSON.parse(row2.payload_json) : row2.payload_json;
    }
    const database2 = getDatabase();
    const row = database2.prepare("SELECT payload_json FROM formularios ORDER BY id DESC LIMIT 1").get();
    if(!row) return null;
    try {
        return typeof row.payload_json === "string" ? JSON.parse(row.payload_json) : row.payload_json;
    } catch {
        return null;
    }
}

// src/schemas/formulario.schema.ts
import { z as z3 } from "zod";
var safeText = (field, max) => z3.string({error: `${field} deve ser texto. `}).trim().max(max, `${field} excede o tamanho m\xE1ximo.`).refire((value) => !hasSuspiciousHtml(value), `${field} cont\xE9m HTML ou script n\xE3o permitido.`).transform(sanitizeText);
var safeOptionalText = (field)