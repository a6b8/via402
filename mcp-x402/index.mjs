import fs from 'fs'
import { FlowMCP } from 'flowmcp'
import { RemoteServer } from 'flowmcpServers'
import { schema } from './schemas/avalanche.mjs'
import { X402Middleware } from 'x402-mcp-middleware'
import { ServerManager } from './helpers/ServerManager.mjs'
import { HTML } from './helpers/HTML.mjs'

const config = {
    'silent': false,
    'envPath': './../.via402.env',
    'snowtraceAddressBaseUrl': 'https://testnet.snowtrace.io/address',
    'envSelection': [
        [ 'facilitatorPublicKey',  'X402_FACILITATOR_PUBLIC_KEY'   ],
        [ 'facilitatorPrivateKey', 'X402_FACILITATOR_PRIVATE_KEY'  ],
        [ 'recepientAddress',      'X402_RECEPIENT_PUBLIC_KEY'     ],
        [ 'serverProviderUrl',     'X402_FUJI_PROVIDER_URL'        ]
    ],
    'arrayOfRoutes': [ 
        {  
            'includeNamespaces': [], 
            'routePath': '/mcp', 
            'protocol': 'streamable' 
        } 
    ],
    'x402': {
        'routePath': '/mcp',
        'chainId': 43113,
        'chainName': 'avax_fuji',
        'restrictedCalls': [
            {
                'method': 'tools/call',
                'name': 'paid_ping_x402',
                'activePaymentOptions': [ 'usdc-fuji' ],
            },
            {
                'method': 'tools/call',
                'name': 'getActivityEVM_simdune',
                'activePaymentOptions': [ 'usdc-fuji' ],
            },
            {
                'method': 'tools/call',
                'name': 'getTokenHoldersEVM_simdune',
                'activePaymentOptions': [ 'usdc-fuji' ],
            },
            {
                'method': 'tools/call',
                'name': 'getCollectiblesEVM_simdune',
                'activePaymentOptions': [ 'usdc-fuji' ],
            }
        ],
        'paymentOptions': {
            'usdc-fuji': { 
                'contractId': 'usdc-fuji',
                'maxAmountRequired': '0.0001',
                'payTo': '{{recepientAddress}}',
            }
        },
        'contracts': {
            'usdc-fuji': {
                'domainName': 'USDC',
                'address': '0x5425890298aed601595a70AB815c96711a31Bc65',
                'assetType': 'erc20',
                'decimals': 6
            }
        }
    }
}


const { silent, envPath, envSelection, arrayOfRoutes, x402, snowtraceAddressBaseUrl } = config
const { routePath, chainId, chainName, restrictedCalls, paymentOptions, contracts } = x402

const { port, environment } = ServerManager
    .getArgs( { argv: process.argv } )
const { x402Credentials, x402PrivateKey } = ServerManager
    .getX402Credentials( { environment, envPath, envSelection } )
// ServerManager.printServerInfo( { environment, envSelection, x402Credentials, x402PrivateKey } )

const envObject = {}
const objectOfSchemaArrays = arrayOfRoutes
    .reduce( ( acc, route ) => {
        acc[ route.routePath ] = [ schema ]
        return acc
    }, {} )

const remoteServer = new RemoteServer( { silent } )
const app = remoteServer.getApp()

remoteServer
    .setConfig( { overwrite: { port: parseInt( port ) } } )
const { routesActivationPayloads } = RemoteServer
    .prepareRoutesActivationPayloads( { arrayOfRoutes, objectOfSchemaArrays, envObject } )
const middleware = await X402Middleware
    .create( { chainId, chainName, contracts, paymentOptions, restrictedCalls, x402Credentials, x402PrivateKey } )
app.use( ( middleware ).mcp() )
HTML.start({
    app,
    routePath,
    suffix: 'streamable',
    schema,
    restrictedCalls,
    chainId,
    chainName, // 'avax_fuji' from your config
    facilitatorPublicKey: x402Credentials.facilitatorPublicKey,
    payToAddress: x402Credentials.recepientAddress,
    explorerAddressBaseUrl: snowtraceAddressBaseUrl
})
remoteServer
    .start( { routesActivationPayloads } )


