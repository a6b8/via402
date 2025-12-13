import fs from 'fs'
import { FlowMCP } from 'flowmcp'
import { RemoteServer } from './flowmcpServers/src/index.mjs'
import { schema as avax } from './schemas/avax.mjs'
import { schema as devToolsSchema } from './schemas/dev-tools.mjs'

import { X402Middleware } from 'x402-mcp-middleware'
import { ServerManager } from './helpers/ServerManager.mjs'
import { HTML } from './helpers/HTML.mjs'
import { Server } from 'http'


const config = {
    'silent': false,
    'envPath': './../.via402.env',
    'snowtraceAddressBaseUrl': 'https://testnet.snowtrace.io/address',
    'envSelection': [
        [ 'facilitatorPublicKey',  'X402_FACILITATOR_PUBLIC_KEY'   ],
        [ 'facilitatorPrivateKey', 'X402_FACILITATOR_PRIVATE_KEY'  ],
        [ 'recepientAddress',      'X402_RECEPIENT_PUBLIC_KEY'     ],
        [ 'serverProviderUrl',     'X402_FUJI_PROVIDER_URL'        ],
        [ 'DUNE_SIM_API_KEY',      'DUNE_SIM_API_KEY'              ]
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
                'activePaymentOptions': [ 'usdc-fuji-cheap' ],
            },
            {
                'method': 'tools/call',
                'name': 'get_activity_evm_avax',
                'activePaymentOptions': [ 'usdc-fuji-standard' ],
            },
            {
                'method': 'tools/call',
                'name': 'get_token_holders_evm_avax',
                'activePaymentOptions': [ 'usdc-fuji-premium' ],
            },
            {
                'method': 'tools/call',
                'name': 'get_collectibles_evm_avax',
                'activePaymentOptions': [ 'usdc-fuji-standard' ],
            }
        ], 
        'paymentOptions': {
            'usdc-fuji-cheap': { 
                'contractId': 'usdc-fuji',
                'maxAmountRequired': '0.0001',
                'payTo': '{{recepientAddress}}',
            },
            'usdc-fuji-standard': { 
                'contractId': 'usdc-fuji',
                'maxAmountRequired': '0.005',
                'payTo': '{{recepientAddress}}',
            },
            'usdc-fuji-premium': { 
                'contractId': 'usdc-fuji',
                'maxAmountRequired': '0.0777',
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


function bugFixContractIds( { paymentOptions, contracts } ) {
    const contractsWithAliases = Object
        .keys( paymentOptions )
        .reduce( ( acc, paymentOptionId ) => {
            const baseId = paymentOptions[ paymentOptionId ].contractId
            if( baseId && contracts[ baseId ] ) {
                acc[ paymentOptionId ] = contracts[ baseId ]
            }
            return acc
        }, { ...contracts } )

    return { contractsWithAliases }
}


const { silent, envPath, envSelection, arrayOfRoutes, x402, snowtraceAddressBaseUrl } = config
const { routePath, chainId, chainName, restrictedCalls, paymentOptions, contracts } = x402


const { version } = ServerManager
    .getNpmPackageVersion( { 'path': './package.json' } )
console.log( `Starting MCP X402 Server - Version ${version}` ) 

const { port, environment } = ServerManager
    .getArgs( { argv: process.argv } )
const { x402Credentials, x402PrivateKey, DUNE_SIM_API_KEY } = ServerManager
    .getX402Credentials( { environment, envPath, envSelection } )
// ServerManager.printServerInfo( { environment, envSelection, x402Credentials, x402PrivateKey } )

const envObject = { DUNE_SIM_API_KEY }
console.log( 'Using DUNE_SIM_API_KEY:', DUNE_SIM_API_KEY ? '****' + DUNE_SIM_API_KEY.slice( -4 ) : 'not set' )
const objectOfSchemaArrays = arrayOfRoutes
    .reduce( ( acc, route ) => {
        acc[ route.routePath ] = [ avax, devToolsSchema ]
        return acc
    }, {} )

// Ensure contracts can be looked up by the payment option keys (the middleware currently uses the payment option id for the lookup)


const remoteServer = new RemoteServer( { silent } )
const app = remoteServer.getApp()

remoteServer
    .setConfig( { overwrite: { port: parseInt( port ) } } )
const { routesActivationPayloads } = RemoteServer
    .prepareRoutesActivationPayloads( { arrayOfRoutes, objectOfSchemaArrays, envObject } )
const { contractsWithAliases } = bugFixContractIds( { paymentOptions, contracts } )
const middleware = await X402Middleware
    .create( { chainId, chainName, contracts: contractsWithAliases, paymentOptions, restrictedCalls, x402Credentials, x402PrivateKey } )
app.use( ( middleware ).mcp() )
HTML.start( {
    app,
    routePath,
    suffix: 'streamable',
    'schema': avax,
    restrictedCalls,
    chainId,
    chainName, // 'avax_fuji' from your config
    facilitatorPublicKey: x402Credentials.facilitatorPublicKey,
    payToAddress: x402Credentials.recepientAddress,
    explorerAddressBaseUrl: snowtraceAddressBaseUrl
} )
remoteServer
    .start( { routesActivationPayloads } )
