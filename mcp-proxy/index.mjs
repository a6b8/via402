import { MCPStreamableProxyServer } from './proxies/MCPStreamableProxyServer.mjs'
import { HTML } from './helpers/HTML.mjs'
import { ServerManager } from './helpers/ServerManager.mjs'


const { port: listenPort } = ServerManager
    .getArgs( { argv: process.argv } )

const proxy = new MCPStreamableProxyServer( {
    listenHost: '0.0.0.0',
    listenPort,
    upstreamUrl: null,
    allowedUpstreamHosts: [
        'localhost',
        'community.flowmcp.org',
        'x402.flowmcp.org'
    ],
    getX402PaymentHeader: () => {}
} )

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
