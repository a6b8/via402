// MCPStreamableProxyServer.mjs

import http from 'node:http'
import express from 'express'
import z from 'zod'

const DEFAULT_PROTOCOL_VERSION = '2025-06-18'

const JSONRPCMessageSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]).optional(),
    method: z.string().optional(),
    params: z.any().optional(),
    result: z.any().optional(),
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.any().optional()
    }).optional()
})

function escapeHtmlForSrcdoc(html) {
    if (!html) return ''
    return String(html)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/<\/script/gi, '<\\/script')
}

/**
 * Options for MCPStreamableProxyServer:
 *
 * - upstreamUrl?            : string | null
 *      Fixed default upstream URL when no ?url= parameter is provided.
 *
 * - allowedUpstreamHosts?   : string[] | null
 *      Enables dynamic upstream URLs via ?url= and defines an allowlist of hostnames
 *      that are permitted as upstreams.
 *
 * - listenHost?             : string
 *      Hostname or IP for the local HTTP server. Default: '127.0.0.1'.
 *
 * - listenPort?             : number
 *      Port for the local HTTP server. Default: 4001.
 *
 * - bearerToken?            : string | null
 *      Optional Bearer token that incoming requests must include as:
 *      Authorization: Bearer <token>
 *
 * - getX402PaymentHeader?   : (originalMessage, x402ErrorPayload, upstreamUrl) => Promise<string | null>
 *      Optional callback to resolve a valid X-PAYMENT header for retrying
 *      402 Payment Required responses from the upstream.
 *
 * - silent?                 : boolean
 *      If true, reduces console logging. Default: false.
 *
 * - mountPath?              : string
 *      Express mount path prefix (e.g. '/mcp'). Default: '/mcp'.
 *
 * - wrapGetHtml?            : (ctx) => string | null
 *      Optional function used to wrap upstream HTML responses for GET requests
 *      in a custom HTML shell (e.g. metadata + <iframe> with srcdoc).
 *      ctx includes:
 *        - req                      : original Express request
 *        - upstreamUrl              : string
 *        - upstreamStatus           : number
 *        - upstreamHeaders          : Record<string, string>
 *        - upstreamHtml             : string
 *        - upstreamHtmlEscaped      : string (safe for use in iframe srcdoc="")
 *
 * Example:
 *
 *   const proxy = new MCPStreamableProxyServer({
 *       upstreamUrl: 'http://localhost:4002/mcp',
 *       allowedUpstreamHosts: ['localhost'],
 *       wrapGetHtml: ({ upstreamUrl, upstreamStatus, upstreamHtmlEscaped }) => `
 *         <!doctype html>
 *         <html>
 *           <head>...</head>
 *           <body>
 *             <div>Meta...</div>
 *             <iframe srcdoc="${upstreamHtmlEscaped}"></iframe>
 *           </body>
 *         </html>
 *       `
 *   })
 *
 *   await proxy.start()
 */
class MCPStreamableProxyServer {
    #server
    #app
    #defaultUpstreamUrl
    #allowedUpstreamHosts
    #listenHost
    #listenPort
    #bearerToken
    #getX402PaymentHeader
    #silent
    #mountPath
    #wrapGetHtml

    constructor({
        upstreamUrl = null,
        allowedUpstreamHosts = null,
        listenHost = '127.0.0.1',
        listenPort = 4001,
        bearerToken = null,
        getX402PaymentHeader = null,
        silent = false,
        mountPath = '/mcp',
        wrapGetHtml = null
    } = {}) {
        // Express app is created immediately so callers can use getApp()
        this.#app = express()
        this.#mountPath = mountPath

        this.#defaultUpstreamUrl = upstreamUrl ? new URL(upstreamUrl) : null

        // Normalize allowlist (lowercase, trim, remove empty strings)
        if (Array.isArray(allowedUpstreamHosts) && allowedUpstreamHosts.length > 0) {
            this.#allowedUpstreamHosts = allowedUpstreamHosts
                .map((h) => String(h).trim().toLowerCase())
                .filter(Boolean)
        } else {
            this.#allowedUpstreamHosts = null
        }

        this.#listenHost = listenHost
        this.#listenPort = listenPort
        this.#bearerToken = bearerToken
        this.#getX402PaymentHeader = getX402PaymentHeader
        this.#silent = silent
        this.#wrapGetHtml = typeof wrapGetHtml === 'function' ? wrapGetHtml : null

        if (!this.#defaultUpstreamUrl && !this.#allowedUpstreamHosts) {
            throw new Error(
                'You must configure either a default upstreamUrl or an allowedUpstreamHosts allowlist ' +
                'to enable dynamic ?url= upstreams.'
            )
        }
    }

    /**
     * Returns the underlying Express application instance.
     * You can use this to mount additional routes before calling start().
     */
    getApp() {
        return this.#app
    }

    /**
     * Returns the configured listen host.
     */
    getListenHost() {
        return this.#listenHost
    }

    /**
     * Returns the configured listen port.
     */
    getListenPort() {
        return this.#listenPort
    }

    /**
     * Returns the default upstream URL, if any.
     */
    getDefaultUpstreamUrl() {
        return this.#defaultUpstreamUrl
    }

    /**
     * Returns the upstream allowlist, if any.
     */
    getAllowedUpstreamHosts() {
        return this.#allowedUpstreamHosts
    }

    /**
     * Start the underlying HTTP server.
     */
    async start() {
        if (this.#server) {
            throw new Error('Proxy server already started')
        }

        // Catch-all *under mountPath* (e.g. /mcp)
        this.#app.use(this.#mountPath, (req, res) => {
            this.#handleRequest(req, res).catch((err) => {
                console.warn('[DEBUG] Unhandled error in request handler:', err)

                if (!res.headersSent) {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'text/plain')
                    res.end('Internal Server Error')
                }
            })
        })

        this.#server = http.createServer(this.#app)

        await new Promise((resolve) => {
            this.#server.listen(this.#listenPort, this.#listenHost, () => {
                if (!this.#silent) {
                    console.warn(
                        `[MCPStreamableProxyServer] Listening on http://${this.#listenHost}:${this.#listenPort}${this.#mountPath}`
                    )
                }
                resolve()
            })
        })
    }

    /**
     * Stop the HTTP server.
     */
    async stop() {
        if (!this.#server) {
            return
        }

        const server = this.#server
        this.#server = undefined

        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) return reject(err)
                resolve()
            })
        })
    }

    /**
     * Main request handler for all methods under mountPath.
     */
    async #handleRequest(req, res) {
        // Basic auth check if bearerToken is configured
        if (this.#bearerToken) {
            const authHeader = req.headers['authorization'] || ''
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice('Bearer '.length).trim()
                : null

            if (token !== this.#bearerToken) {
                if (!this.#silent) {
                    console.warn('[DEBUG] Unauthorized request (missing/invalid Bearer token)')
                }
                res.statusCode = 401
                res.setHeader('Content-Type', 'text/plain')
                res.end('Unauthorized')
                return
            }
        }

        const method = (req.method || 'GET').toUpperCase()

        if (method === 'GET') {
            return this.#handleGet(req, res)
        }

        if (method !== 'POST' && method !== 'DELETE') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
                error: 'Method Not Allowed',
                message: `Method ${method} is not supported. Use GET for HTTP-based tools or POST/DELETE for JSON-RPC.`
            }))
            return
        }

        // For POST/DELETE, buffer body fully (could be JSON-RPC)
        const chunks = []
        req.on('data', (chunk) => {
            chunks.push(chunk)
        })

        await new Promise((resolve) => {
            req.on('end', resolve)
        })

        const body = Buffer.concat(chunks).toString('utf8')

        return this.#handleWithBody(req, res, body)
    }

    /**
     * Resolve upstream URL from either defaultUpstreamUrl or ?url= param.
     */
    #resolveUpstreamUrl(req) {
        const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`)
        const rawParam = url.searchParams.get('url')

        if (rawParam) {
            const candidate = new URL(rawParam)

            if (!this.#allowedUpstreamHosts) {
                throw new Error('Dynamic upstream URL not allowed (no allowlist configured)')
            }

            const hostname = (candidate.hostname || '').toLowerCase()
            if (!this.#allowedUpstreamHosts.includes(hostname)) {
                throw new Error(
                    `Upstream host "${hostname}" is not in the allowedUpstreamHosts allowlist.`
                )
            }

            return candidate
        }

        if (!this.#defaultUpstreamUrl) {
            throw new Error('No upstreamUrl provided and no dynamic ?url= was specified.')
        }

        return new URL(this.#defaultUpstreamUrl.toString())
    }

    /**
     * Build headers to send to the upstream.
     */
    #buildUpstreamHeaders(req, {
        method,
        acceptSSE = false
    }) {
        const headers = new Map()

        // Forward selected headers, but normalize & control encoding
        const incoming = req.headers || {}
        for (const [key, value] of Object.entries(incoming)) {
            if (typeof value === 'undefined') continue
            const lower = key.toLowerCase()

            // Skip hop-by-hop headers
            if (['connection', 'keep-alive', 'transfer-encoding'].includes(lower)) {
                continue
            }

            // We'll control encoding explicitly
            if (['accept-encoding'].includes(lower)) {
                continue
            }

            // We'll handle Host
            if (lower === 'host') {
                continue
            }

            // For Authorization: allow forwarding but don't override if upstream has special config
            headers.set(lower, value)
        }

        // Force identity encoding so we can safely buffer/stream as needed
        headers.set('accept-encoding', 'identity')

        // Ensure JSON content-type for JSON-RPC
        if (method === 'POST' || method === 'DELETE') {
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json')
            }
        }

        // Default Accept if not provided
        if (!headers.has('accept')) {
            headers.set('accept', '*/*')
        }

        // Ensure we don't forward any existing X-PAYMENT header,
        // as we'll want to manage X402 retries explicitly.
        headers.delete('x-payment')

        // Set protocol version
        if (!headers.has('mcp-protocol-version')) {
            headers.set('mcp-protocol-version', DEFAULT_PROTOCOL_VERSION)
        }

        // For GET: ensure text/event-stream is accepted
        if (acceptSSE) {
            const existing = headers.get('accept') || ''
            const parts = new Set(
                existing
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
            )
            parts.add('text/event-stream')
            headers.set('accept', Array.from(parts).join(', '))
        }

        return headers
    }

    async #handleGet(req, res) {
        const controller = new AbortController()
        const signal = controller.signal

        res.on('close', () => {
            controller.abort()
        })

        let upstreamUrl
        try {
            upstreamUrl = this.#resolveUpstreamUrl(req)
        } catch (err) {
            console.warn('[DEBUG] Upstream URL resolution failed for GET:', err)
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain')
            res.end(`Bad Request: ${err.message}`)
            return
        }

        const headers = this.#buildUpstreamHeaders(req, {
            method: 'GET',
            acceptSSE: true
        })

        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers,
            signal
        })

        const contentType = upstreamResponse.headers.get('content-type') || ''

        if (!this.#silent) {
            console.warn(
                '[DEBUG] Upstream GET response:',
                upstreamResponse.status,
                contentType,
                'from',
                upstreamUrl.toString()
            )
        }

        // If a wrapGetHtml function is configured and the upstream responds with HTML,
        // let the wrapper render a full HTML document (e.g. metadata + iframe).
        if (this.#wrapGetHtml && contentType.includes('text/html')) {
            const upstreamHtml = await upstreamResponse.text()

            const ctx = {
                req,
                upstreamUrl: upstreamUrl.toString(),
                upstreamStatus: upstreamResponse.status,
                upstreamHeaders: Object.fromEntries(upstreamResponse.headers.entries()),
                upstreamHtml,
                upstreamHtmlEscaped: escapeHtmlForSrcdoc(upstreamHtml)
            }

            let wrappedHtml
            try {
                wrappedHtml = this.#wrapGetHtml(ctx)
            } catch (err) {
                console.warn('[DEBUG] wrapGetHtml threw an error, falling back to direct proxying:', err)
            }

            if (typeof wrappedHtml === 'string' && wrappedHtml.length > 0) {
                const buf = Buffer.from(wrappedHtml, 'utf8')
                res.statusCode = 200 // or preserve ctx.upstreamStatus if desired
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                res.setHeader('Content-Length', String(buf.length))
                res.end(buf)
                return
            }
        }

        // Fallback: behave like a normal transparent proxy.
        await this.#pipeUpstreamResponse(upstreamResponse, res)
    }

    async #handleWithBody(req, res, body) {
        const method = req.method || 'POST'
        const controller = new AbortController()
        const signal = controller.signal

        res.on('close', () => {
            controller.abort()
        })

        let upstreamUrl
        try {
            upstreamUrl = this.#resolveUpstreamUrl(req)
        } catch (err) {
            console.warn('[DEBUG] Upstream URL resolution failed for POST/DELETE:', err)
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
                error: 'Bad Request',
                message: err.message
            }))
            return
        }

        if (!this.#silent && body?.length) {
            try {
                const parsed = JSON.parse(body)
                console.warn('[DEBUG] Upstream JSON-RPC request:', parsed)
            } catch (err) {
                console.warn('[DEBUG] Request body is not valid JSON:', err)
            }
        }

        const headers = this.#buildUpstreamHeaders(req, {
            method,
            acceptSSE: false
        })

        let attempt = 0
        let lastError

        while (attempt < 2) {
            attempt += 1

            const requestInit = {
                method,
                headers,
                body,
                signal
            }

            let upstreamResponse
            try {
                upstreamResponse = await fetch(upstreamUrl, requestInit)
            } catch (err) {
                lastError = err
                console.warn('[DEBUG] Upstream fetch error:', err)
                break
            }

            if (!this.#silent) {
                console.warn(
                    '[DEBUG] Upstream response:',
                    upstreamResponse.status,
                    upstreamResponse.headers.get('content-type'),
                    'from',
                    upstreamUrl.toString()
                )
            }

            if (upstreamResponse.status !== 402 || !this.#getX402PaymentHeader) {
                await this.#pipeUpstreamResponse(upstreamResponse, res)
                return
            }

            let errorPayload = null
            try {
                const cloned = upstreamResponse.clone()
                const text = await cloned.text()
                try {
                    // Try JSON first
                    errorPayload = JSON.parse(text)
                } catch {
                    // Fallback to raw text
                    errorPayload = { raw: text }
                }
            } catch (err) {
                console.warn('[x402] Failed to read upstream 402 body:', err)
            }

            let originalMessage = null
            try {
                originalMessage = JSON.parse(body || '{}')
            } catch (err) {
                console.warn('[x402] Failed to parse original request body as JSON:', err)
            }

            console.warn('[x402] 402 Payment Required - payload:', errorPayload)

            try {
                const header = await this.#getX402PaymentHeader(
                    originalMessage,
                    errorPayload,
                    upstreamUrl
                )

                if (header) {
                    console.warn('[x402] Retrying upstream request with X-PAYMENT header')
                    headers.set('x-payment', header)
                    // Try again with same body/method, but with X-PAYMENT header in place
                    continue
                } else {
                    console.warn('[x402] No X-PAYMENT header provided, returning original 402 to client.')
                }
            } catch (err) {
                console.warn('[x402] getX402PaymentHeader threw an error:', err)
                lastError = err
            }

            // If we reached here, we couldn't resolve payment or an error occurred.
            // Return the original 402 response to the client.
            await this.#pipeUpstreamResponse(upstreamResponse, res)
            return
        }

        if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
                error: 'Bad Gateway',
                message: lastError ? String(lastError.message || lastError) : 'Unknown upstream error'
            }))
        }
    }

    /**
     * Pipes the upstream response to the client, buffering the body so we can inspect or log it.
     */
    async #pipeUpstreamResponse(upstreamResponse, res) {
        const status = upstreamResponse.status
        const headers = {}

        for (const [key, value] of upstreamResponse.headers.entries()) {
            const lower = key.toLowerCase()

            // Skip hop-by-hop headers
            if (['connection', 'keep-alive', 'transfer-encoding'].includes(lower)) {
                continue
            }

            headers[key] = value
        }

        const contentType = upstreamResponse.headers.get('content-type') || ''

        // If it's text/event-stream, we want to stream it directly.
        if (contentType.includes('text/event-stream')) {
            res.writeHead(status, headers)
            for await (const chunk of upstreamResponse.body) {
                res.write(chunk)
            }
            res.end()
            return
        }

        // Otherwise, buffer the response fully.
        const chunks = []
        for await (const chunk of upstreamResponse.body) {
            chunks.push(chunk)
        }
        const arrBuf = Buffer.concat(chunks)
        const buf = Buffer.from(arrBuf)

        if (contentType && !headers['Content-Type']) {
            headers['Content-Type'] = contentType
        }

        headers['Content-Length'] = String(buf.length)

        res.writeHead(status, headers)
        res.end(buf)
    }
}

export { MCPStreamableProxyServer }
