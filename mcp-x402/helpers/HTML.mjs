class HTML {
    static start( {
        app,
        routePath,
        suffix = 'streamable',
        chainId,
        schema,
        restrictedCalls,
        chainName,
        facilitatorPublicKey,
        payToAddress,
        explorerAddressBaseUrl
    } ) {

        const { namespace } = schema
        const tools = Object
            .keys( schema['routes'] )
            .map( routeName => ( { 'name': routeName + `_${namespace}`, 'protected': null } ) )
            .map( tool => { 
                const isProtected = restrictedCalls
                    .some( rc => rc['name'] === tool.name )
                tool.protected = isProtected
                return tool
            } )

        const fullPath = routePath + '/' + suffix

        app.get( '/', (req, res) => {
            const serverUrl =
                req.protocol + '://' + req.get('host') + routePath + '/' + suffix

            return res.send(
                HTML.#getFrontpage({
                    serverUrl,
                    tools,
                    chainId,
                    chainName,
                    facilitatorPublicKey,
                    payToAddress,
                    explorerAddressBaseUrl
                })
            )
        } )
    }

    static #getFrontpage({
        serverUrl,
        tools = [],
        chainId,
        chainName,
        facilitatorPublicKey,
        payToAddress,
        explorerAddressBaseUrl
    }) {
        const networkLabel =
            chainId === 43113 || chainName === 'avax_fuji'
                ? 'Avalanche Fuji (Testnet, chainId 43113)'
                : `${chainName || 'Unknown network'}${chainId ? ` (chainId ${chainId})` : ''}`

        const rows =
            tools.length > 0
                ? tools
                      .map(
                          (tool) => `
            <tr>
                <td><code>${tool.name}</code></td>
                <td>${tool.protected ? 'X402-protected' : 'free'}</td>
            </tr>`
                      )
                      .join('')
                : `<tr><td colspan="2">No tools provided.</td></tr>`

        const facilitatorUrl =
            facilitatorPublicKey && explorerAddressBaseUrl
                ? `${explorerAddressBaseUrl}/${facilitatorPublicKey}`
                : null

        const payToUrl =
            payToAddress && explorerAddressBaseUrl
                ? `${explorerAddressBaseUrl}/${payToAddress}`
                : null

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>X402 Test MCP Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 720px;
            margin: 0 auto;
            background: #ffffff;
            padding: 24px 28px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        h1 {
            margin-top: 0;
            color: #222;
        }
        h2 {
            margin-top: 1.6em;
            color: #333;
        }
        p {
            font-size: 0.98em;
            line-height: 1.6;
            color: #333;
        }
        code {
            font-family: Menlo, Consolas, monospace;
            background: #f0f0f0;
            padding: 3px 6px;
            border-radius: 4px;
        }
        .endpoint {
            margin: 12px 0 18px;
            padding: 10px 12px;
            background: #f7f9fc;
            border-radius: 8px;
            border: 1px solid #d9e2f2;
            font-size: 0.95em;
            word-break: break-all;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 0.95em;
        }
        th, td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e2e2;
            text-align: left;
        }
        th {
            background: #f5f5f5;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .meta {
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>x402 Test MCP Server</h1>
        <p>
            This is a <strong>test MCP server</strong> with routes exposed via MCP.
            Some tools are free, some require an <strong>X402 payment</strong>.
        </p>

        <h2>MCP endpoint</h2>
        <p>Use this URL as MCP server in your AI client:</p>
        <div class="endpoint">
            <code>${serverUrl}</code>
        </div>

        <h2>Tools</h2>
        <p>Available tools and whether they require X402:</p>
        <table>
            <thead>
                <tr>
                    <th>Tool</th>
                    <th>Access</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>

        <h2>Payments (Avalanche Fuji)</h2>
        <p>
            Paid tools use X402 on <strong>${networkLabel}</strong>.
            Transactions are visible on-chain (Fuji testnet).
        </p>
        <ul>
            <li>
                <strong>Facilitator (pays gas & signs):</strong>
                ${facilitatorPublicKey
                    ? facilitatorUrl
                        ? `<a href="${facilitatorUrl}" target="_blank" rel="noopener noreferrer"><code>${facilitatorPublicKey}</code></a>`
                        : `<code>${facilitatorPublicKey}</code>`
                    : 'not configured'}
            </li>
            <li>
                <strong>Pay-to / recipient address:</strong>
                ${payToAddress
                    ? payToUrl
                        ? `<a href="${payToUrl}" target="_blank" rel="noopener noreferrer"><code>${payToAddress}</code></a>`
                        : `<code>${payToAddress}</code>`
                    : 'not configured'}
            </li>
        </ul>
        <p class="meta">
            Payments are made in test USDC on Fuji; this server is for demo and testing only.
        </p>
    </div>
</body>
</html>`

        return html
    }
}

export { HTML }
