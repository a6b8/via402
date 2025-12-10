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

/**
 * Options for MCPStreamableProxyServer:
 *
 * - upstreamUrl?            : string | null
 *      Fixed default upstream URL when no ?url= parameter is provided.
 *
 * - allowedUpstreamHosts?   : string[] | null
 *      Enables dynamic upstream URLs via ?url= and defines an allowlist.
 *      Possible entries:
 *          - 'community.flowmcp.org'
 *          - 'localhost'
 *          - 'localhost:4002'
 *          - '*.flowmcp.org'   (wildcard for subdomains)
 *
 * - getX402PaymentHeader?   : (originalMessage, errorPayload, upstreamUrl) => string | null | Promise<string | null>
 *      Callback invoked on HTTP 402 (POST) which can return an X-PAYMENT header.
 *      If it returns null, the original 402 is forwarded to the client.
 *
 * This class now internally creates an Express app so that you can
 * mount additional routes (e.g. HTML debug UI) before starting the server.
 *
 * Usage:
 *
 *   const proxy = new MCPStreamableProxyServer({ ...options })
 *   const app = proxy.getApp()
 *
 *   // Attach your HTML UI to the same Express app:
 *   HTMLTokenValidation.start({
 *       app,
 *       routePath: '/dashboard',
 *       suffix: 'token_validation',
 *       apiPath: '/api/v1/agent_payz/token_validation',
 *       allowedUpstreamHosts: [...]
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

    constructor({
        upstreamUrl = null,
        allowedUpstreamHosts = null,
        listenHost = '127.0.0.1',
        listenPort = 4001,
        bearerToken = null,
        getX402PaymentHeader = null,
        silent = false,
        mountPath = '/mcp'
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
     * Starts the HTTP server. This will:
     *  - attach a catch-all Express route that forwards unmatched requests to the proxy handler
     *  - create an http.Server from the Express app
     *  - listen on listenHost:listenPort
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
                } else {
                    try {
                        res.end()
                    } catch (_) {
                        // ignore
                    }
                }
            })
        })

        this.#server = http.createServer(this.#app)

        await new Promise((resolve) => {
            this.#server.listen(this.#listenPort, this.#listenHost, () => {
                if (!this.#silent) {
                    const upstreamInfo = this.#defaultUpstreamUrl
                        ? `defaultUpstream=${this.#defaultUpstreamUrl.toString()}`
                        : 'no defaultUpstream (dynamic only via ?url= and allowlist)'

                    const allowInfo = this.#allowedUpstreamHosts
                        ? `allowedUpstreamHosts=[${this.#allowedUpstreamHosts.join(', ')}]`
                        : 'allowedUpstreamHosts=DISABLED (no dynamic ?url=)'

                    console.warn(
                        `[INFO] MCP Streamable proxy listening on http://${this.#listenHost}:${this.#listenPort}${this.#mountPath}, ${upstreamInfo}, ${allowInfo}`
                    )
                }

                resolve()
            })
        })
    }



    async close() {
        if (!this.#server) return

        await new Promise((resolve, reject) => {
            this.#server.close((err) => {
                if (err) reject(err)
                else resolve()
            })
        })

        this.#server = null
    }

    async #handleRequest(req, res) {
        const method = req.method || 'GET'
        const urlForLog = req.originalUrl || req.url || '/'

        if (!this.#silent) {
            console.warn(`[DEBUG] Incoming request: ${method} ${urlForLog}`)
        }

        if (method === 'GET') {
            return this.#handleGet(req, res)
        }

        if (method === 'POST' || method === 'DELETE') {
            const body = await this.#readRequestBody(req)
            return this.#handleWithBody(req, res, body)
        }

        res.statusCode = 405
        res.setHeader('Content-Type', 'text/plain')
        res.end('Method Not Allowed')
    }

    #readRequestBody(req) {
        return new Promise((resolve, reject) => {
            const chunks = []

            req.on('data', (chunk) => {
                chunks.push(chunk)
            })

            req.on('end', () => {
                resolve(Buffer.concat(chunks))
            })

            req.on('error', (err) => {
                reject(err)
            })
        })
    }

    /**
     * Resolves the upstream URL for a given request.
     *
     * Order:
     * 1. If ?url=<...> is set:
     *      - only allowed if allowedUpstreamHosts is configured
     *      - URL is parsed and checked against the allowlist
     * 2. Otherwise: defaultUpstreamUrl from the constructor
     *
     * If neither is available or the allowlist rejects it -> throws an Error.
     */
    #resolveUpstreamUrl(req) {
        const rawUrl = req.url || '/'
        let proxyUrl

        try {
            proxyUrl = new URL(rawUrl, 'http://proxy.local')
        } catch (err) {
            throw new Error(`Failed to parse incoming proxy URL: ${err.message}`)
        }

        const upstreamParam = proxyUrl.searchParams.get('url')

        // 1) Dynamic upstream via ?url=
        if (upstreamParam) {
            if (!this.#allowedUpstreamHosts || this.#allowedUpstreamHosts.length === 0) {
                throw new Error(
                    'Dynamic upstream URLs via ?url= are disabled. ' +
                    'Configure allowedUpstreamHosts to enable them.'
                )
            }

            let upstream
            try {
                upstream = new URL(upstreamParam)
            } catch (err) {
                throw new Error(`Invalid upstream URL in ?url parameter: ${err.message}`)
            }

            this.#ensureUpstreamAllowed(upstream)
            return upstream
        }

        // 2) Fallback: defaultUpstreamUrl
        if (this.#defaultUpstreamUrl) {
            return this.#defaultUpstreamUrl
        }

        throw new Error(
            'No upstream URL: provide ?url=<encoded url> (matching allowedUpstreamHosts) ' +
            'or configure a default upstreamUrl.'
        )
    }

    /**
     * Ensures that the provided upstream URL is allowed by the allowlist.
     *
     * Rules:
     * - Only http/https protocols are allowed
     * - Host must match allowedUpstreamHosts:
     *      - exact hostnames: 'community.flowmcp.org'
     *      - host:port       : 'localhost:4002'
     *      - wildcard        : '*.flowmcp.org' (matches e.g. 'api.flowmcp.org')
     */
    #ensureUpstreamAllowed(upstreamUrl) {
        const protocol = upstreamUrl.protocol

        if (protocol !== 'http:' && protocol !== 'https:') {
            throw new Error(
                `Upstream protocol "${protocol}" is not allowed. Only http and https are permitted.`
            )
        }

        const hostname = upstreamUrl.hostname.toLowerCase()
        const port = upstreamUrl.port || (protocol === 'https:' ? '443' : '80')
        const hostWithPort = `${hostname}:${port}`

        if (!this.#allowedUpstreamHosts || this.#allowedUpstreamHosts.length === 0) {
            // Should not happen because caller already checks this before allowing ?url=
            throw new Error('No allowedUpstreamHosts configured.')
        }

        const isAllowed = this.#allowedUpstreamHosts.some((patternRaw) => {
            const pattern = patternRaw.toLowerCase().trim()
            if (!pattern) return false

            // Wildcard: *.example.com
            if (pattern.startsWith('*.')) {
                const suffix = pattern.slice(1) // e.g. '.flowmcp.org'
                // Host must end with suffix and must not be exactly the suffix without star
                return hostname.endsWith(suffix) && hostname !== suffix.slice(1)
            }

            // Exact hostname
            if (hostname === pattern) return true

            // Host:Port
            if (hostWithPort === pattern) return true

            return false
        })

        if (!isAllowed) {
            throw new Error(
                `Upstream host "${hostWithPort}" is not in allowedUpstreamHosts ` +
                `(${this.#allowedUpstreamHosts.join(', ')}).`
            )
        }
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

        if (!this.#silent) {
            console.warn(
                '[DEBUG] Upstream GET response:',
                upstreamResponse.status,
                upstreamResponse.headers.get('content-type'),
                'from',
                upstreamUrl.toString()
            )
        }

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
                const parsed = JSON.parse(body.toString('utf8'))
                const msg = JSONRPCMessageSchema.parse(parsed)
                console.warn('[DEBUG] Incoming JSON-RPC message from client:', msg)
            } catch (err) {
                console.warn('[DEBUG] Failed to parse incoming JSON as JSON-RPC:', err)
            }
        }

        const headers = this.#buildUpstreamHeaders(req, {
            method,
            ensureStreamableAccept: true
        })

        let upstreamResponse = await fetch(upstreamUrl, {
            method,
            headers,
            body,
            signal
        })

        if (!this.#silent) {
            console.warn(
                '[DEBUG] Upstream POST/DELETE response:',
                upstreamResponse.status,
                upstreamResponse.headers.get('content-type'),
                'from',
                upstreamUrl.toString()
            )
        }

        // 402 Payment Required Handling (X402)
        if (upstreamResponse.status === 402 && this.#getX402PaymentHeader && method === 'POST') {
            let errorPayload = null
            let originalMessage = null

            try {
                errorPayload = await upstreamResponse.json()
            } catch (err) {
                console.warn('[x402] Failed to parse 402 JSON payload:', err)
            }

            try {
                if (body?.length) {
                    originalMessage = JSON.parse(body.toString('utf8'))
                }
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
                    console.warn('[x402] Retrying upstream request with X-PAYMENT header.')

                    const retryHeaders = this.#buildUpstreamHeaders(req, {
                        method,
                        ensureStreamableAccept: true
                    })

                    retryHeaders.set('X-PAYMENT', header)

                    upstreamResponse = await fetch(upstreamUrl, {
                        method,
                        headers: retryHeaders,
                        body,
                        signal
                    })

                    if (!upstreamResponse.ok && upstreamResponse.status !== 202) {
                        console.warn(
                            `[x402] Retry failed: HTTP ${upstreamResponse.status} ${upstreamResponse.statusText}`
                        )
                    }
                } else {
                    console.warn('[x402] getX402PaymentHeader returned no header, forwarding original 402 to client.')
                }
            } catch (err) {
                console.warn('[x402] Error during payment header handling, forwarding original 402:', err)
            }
        }

        await this.#pipeUpstreamResponse(upstreamResponse, res)
    }

    #buildUpstreamHeaders(req, {
        method,
        acceptSSE = false,
        ensureStreamableAccept = false
    } = {}) {
        const headers = new Headers()
        headers.set('accept-encoding', 'identity')

        // Forward incoming headers (except some hop-by-hop ones)
        for (const [name, value] of Object.entries(req.headers)) {
            if (!value) continue

            const lower = name.toLowerCase()

            if (lower === 'host') continue
            if (lower === 'connection') continue
            if (lower === 'content-length') continue
            if (lower === 'accept-encoding') continue

            if (Array.isArray(value)) {
                headers.set(name, value.join(', '))
            } else {
                headers.set(name, String(value))
            }
        }

        // Optional static bearer token configured on the proxy itself
        if (this.#bearerToken) {
            headers.set('Authorization', `Bearer ${this.#bearerToken}`)
        }

        // Ensure MCP protocol version
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

        // For POST/DELETE: ensure application/json + text/event-stream in Accept
        if (ensureStreamableAccept && (method === 'POST' || method === 'DELETE')) {
            const existing = headers.get('accept') || ''
            const parts = new Set(
                existing
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
            )
            parts.add('application/json')
            parts.add('text/event-stream')
            headers.set('accept', Array.from(parts).join(', '))
        }

        return headers
    }

    async #pipeUpstreamResponse(upstreamResponse, res) {
        const status = upstreamResponse.status
        const contentType = upstreamResponse.headers.get('content-type') || ''

        // Copy upstream headers, filtering out problematic ones
        const headers = {}

        upstreamResponse.headers.forEach((value, name) => {
            const lower = name.toLowerCase()

            if (lower === 'transfer-encoding') return
            if (lower === 'connection') return
            if (lower === 'keep-alive') return
            if (lower === 'content-length') return
            if (lower === 'content-encoding') return   // <--- NEU

            headers[name] = value
        })

        // SSE stream -> pipe directly
        if (contentType.includes('text/event-stream')) {
            headers['Content-Type'] = 'text/event-stream'

            if (!headers['Cache-Control']) {
                headers['Cache-Control'] = 'no-cache'
            }

            headers['Connection'] = 'keep-alive'

            res.writeHead(status, headers)

            const body = upstreamResponse.body

            if (!body) {
                res.end()
                return
            }

            const reader = body.getReader()

            try {
                while (true) {
                    const { value, done } = await reader.read()

                    if (done) break
                    if (value) {
                        res.write(Buffer.from(value))
                    }
                }
            } catch (err) {
                console.warn('[DEBUG] Error while piping SSE upstream response:', err)
            } finally {
                res.end()
            }

            return
        }

        // 202 Accepted with optional small body
        if (status === 202) {
            res.writeHead(status, headers)

            if (upstreamResponse.body) {
                try {
                    const arrBuf = await upstreamResponse.arrayBuffer()
                    const buf = Buffer.from(arrBuf)
                    if (buf.length) {
                        res.write(buf)
                    }
                } catch (_) {
                    // Ignore – 202 normally has no body
                }
            }

            res.end()
            return
        }

        // Everything else: buffer the body and send once
        const arrBuf = upstreamResponse.body
            ? await upstreamResponse.arrayBuffer()
            : new ArrayBuffer(0)

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
