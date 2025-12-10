import { MCPStreamableProxyServer } from './proxies/MCPStreamableProxyServer.mjs'
import { HTML } from './helpers/HTML.mjs'


const proxy = new MCPStreamableProxyServer( {
    listenHost: '127.0.0.1',
    listenPort: 4001,
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
