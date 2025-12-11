import { MCPStreamableProxyServer } from './proxies/MCPStreamableProxyServer.mjs'
import { HTML } from './helpers/HTML.mjs'
import { ServerManager } from './helpers/ServerManager.mjs'


const { port: listenPort } = ServerManager
    .getArgs( { argv: process.argv } )

const proxy = new MCPStreamableProxyServer({
    listenHost: '0.0.0.0',
    listenPort,
    upstreamUrl: null,
    allowedUpstreamHosts: [
        'localhost',
        'community.flowmcp.org',
        'x402.flowmcp.org'
    ],

    // dein X402-Handler (kann auch erstmal leer bleiben)
    getX402PaymentHeader: () => {},

    // NEU: Template-Funktion für GET-HTML-Antworten
    wrapGetHtml: ({
        upstreamUrl,
        upstreamStatus,
        upstreamHeaders,
        upstreamHtmlEscaped
    }) => `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>MCP Proxy UI</title>
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                background: #050608;
                color: #eee;
              }
              .meta {
                padding: 10px 14px;
                background: #11141a;
                border-bottom: 1px solid #22252b;
                font-size: 13px;
              }
              .meta-row {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
              }
              .meta-label {
                opacity: 0.7;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.06em;
              }
              code {
                background: #1b1f27;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                word-break: break-all;
              }
              .status-badge {
                padding: 2px 8px;
                border-radius: 999px;
                font-size: 11px;
                border: 1px solid #444;
              }
              .frame-wrapper {
                margin: 10px;
                border: 3px solid red;       /* <--- rote Umrandung */
                border-radius: 6px;
                overflow: hidden;
              }
              .frame-wrapper iframe {
                width: 100%;
                height: calc(100vh - 80px);
                border: none;
                background: #fff;
              }
            </style>
          </head>
          <body>
            <div class="meta">
              <div class="meta-row">
                <div>
                  <div class="meta-label">Upstream URL</div>
                  <code>${upstreamUrl}</code>
                </div>
                <div>
                  <div class="meta-label">Status</div>
                  <span class="status-badge">${upstreamStatus}</span>
                </div>
              </div>
            </div>
            <div class="frame-wrapper">
              <iframe
                sandbox=""
                srcdoc="${upstreamHtmlEscaped}">
              </iframe>
            </div>
          </body>
        </html>
    `
})


const app = proxy.getApp()

HTML.start({
    app,
    routePath: '/dashboard',
    suffix: 'token_validation',
    apiPath: '/api/v1/agent_payz/token_validation',
    allowedUpstreamHosts: [
        'localhost',
        'community.flowmcp.org',
        'x402.flowmcp.org'
    ]
})

await proxy.start()
