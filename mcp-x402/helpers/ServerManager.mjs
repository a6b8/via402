import fs from 'fs'


class ServerManager {
    static getNpmPackageVersion( { path } ) {
        const packageJsonContent = fs.readFileSync( path, 'utf-8' )
        const { version } = JSON.parse( packageJsonContent )
        return { version }
    }


    static getArgs( { argv } ) {
        const requiredArgs = [ 'port', 'environment' ]

        const args = argv
            .slice( 2 )
            .filter( arg => arg.includes( '=' ) )
            .reduce( ( acc, arg ) => {
                const [ key, value ] = arg.split( '=' )
                acc[ key.trim() ] = value.trim()
                return acc
            }, {} )

        const test = requiredArgs
            .reduce( ( acc, key ) => {
                if( !( key in args ) ) {
                    acc.messages.push( `Missing required argument: ${key}` )
                }
                return acc
            }, { 'messages': [] }  )
        if( test['messages'].length > 0 ) {
            test['messages'].forEach( message => console.log( message ) )
            process.exit( 1 )
        }

        return args
    }


    static getX402Credentials( { environment, envPath, envSelection } ) {
        const envObject = this
            .#getEnvObject( { environment, envPath } )
        const test = envSelection
            .reduce( ( acc, [ _, envVar ] ) => {
                if( !( envVar in envObject ) ) {
                    acc.messages.push( `Missing required environment variable: ${envVar}` )
                }
                return acc
            }, { 'messages': [] }  )
        if( test['messages'].length > 0 ) {
            test['messages'].forEach( message => console.log( message ) )
            process.exit( 1 )
        }

        const x402Credentials = envSelection
            .reduce( ( acc, [ key, envVar ] ) => {
                acc[ key ] = envObject[ envVar ]
                return acc
            }, {} )
        delete x402Credentials[ 'X402_PRIVATE_KEY' ]
        const x402PrivateKey = envObject[ 'X402_FACILITATOR_PRIVATE_KEY' ]

        return { x402Credentials, x402PrivateKey, DUNE_SIM_API_KEY: envObject[ 'DUNE_SIM_API_KEY' ]  }
    }


    static printServerInfo( { environment, envSelection, x402Credentials, x402PrivateKey } ) {
        console.log( 'Server:' )
        console.log( `  Environment              ${environment}` )
        console.log( '  Private Key Available     ' + ( x402PrivateKey ? 'Yes' : 'No' ) )

        console.log( '  Credentials' )
        envSelection
            .filter( ( [ k, v ] ) => v.includes( 'PRIVATE' ) === false )
            .forEach( ( [ key, envVar ] ) => {
                const padding = ' '.repeat( 22 - key.length )
                console.log( `    ${key}${padding} ${ x402Credentials[ key ].slice( 0, 4 ) }...${ x402Credentials[ key ].slice( -4 ) }` )
            } )

    }


    static #getEnvObject( { environment, envPath } ) {
        if( environment === 'production' ) {
            // In production prefer real env vars, but allow a fallback .env file if present
            if( envPath && fs.existsSync( envPath ) ) {
                try {
                    const envFile = fs
                        .readFileSync( envPath, 'utf-8' )
                        .split( "\n" )
                        .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
                        .map( line => line.split( '=' ) )
                        .reduce( ( acc, [ k, v ] ) => {
                            acc[ k ] = v.trim()
                            return acc
                        }, {} )
                    return { ...envFile, ...process.env }
                } catch( err ) {
                    console.error( `Error reading environment file at ${envPath}:`, err )
                    process.exit( 1 )
                    return false
                }
            }
            return process.env
        } else if( environment !== 'development' ) {
            console.error( `Unknown environment: ${environment}` )
            process.exit( 1 )
            return false
        }

        if( !envPath ) {
            console.error( `No environment file found for stage type: ${stageType}` )
            return false
        }

        try {
            const envFile = fs
                .readFileSync( envPath, 'utf-8' )
                .split( "\n" )
                .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
                .map( line => line.split( '=' ) )
                .reduce( ( acc, [ k, v ] ) => {
                    acc[ k ] = v.trim()
                    return acc
                }, {} )
            return envFile
        } catch( err ) {
            console.error( `Error reading environment file at ${envPath}:`, err )
            process.exit( 1 )
            return false
        }

        return false
    }
}


export { ServerManager }
