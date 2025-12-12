// Sources: Sim by Dune EVM schemas (balances/transactions/collectibles/token-info/token-holders/activity) :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1} :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5} | FlowMCP spec :contentReference[oaicite:6]{index=6}

const SUPPORTED_CHAINS = [
    { alias: "AVALANCHE_MAINNET", id: 43114, name: "avalanche_c" },
    { alias: "AVALANCHE_FUJI", id: 43113, name: "avalanche_fuji" }
];

const chainAliasEnum = "enum(AVALANCHE_MAINNET,AVALANCHE_FUJI)";
const supportedChainsStr = SUPPORTED_CHAINS.map(({ alias }) => alias).join(",");

const getParam = (userParams, key) => userParams?.[key] ?? userParams?._allParams?.[key];
const getChainIdByAlias = (alias) => SUPPORTED_CHAINS.find((c) => c.alias === alias)?.id;

const schema = {
    namespace: "avax",
    name: "Sim by Dune - Avalanche Only",
    description: "Combined Sim by Dune schema containing all provided EVM routes, restricted to Avalanche Mainnet (C-Chain) or Avalanche Fuji.",
    docs: [
        "https://docs.sim.dune.com/evm/balances",
        "https://docs.sim.dune.com/evm/transactions",
        "https://docs.sim.dune.com/evm/collectibles",
        "https://docs.sim.dune.com/evm/token-info",
        "https://docs.sim.dune.com/evm/token-holders",
        "https://docs.sim.dune.com/evm/activity"
    ],
    tags: [
        "simdune.getBalancesEVM",
        "simdune.getTransactionsEVM",
        "simdune.getCollectiblesEVM",
        "simdune.getTokenInfoEVM",
        "simdune.getTokenHoldersEVM",
        "simdune.getActivityEVM",
        "simdune.getActivityDetailedEVM"
    ],
    flowMCP: "1.2.0",
    root: "https://api.sim.dune.com",
    requiredServerParams: ["DUNE_SIM_API_KEY"],
    headers: { "X-Sim-Api-Key": "{{DUNE_SIM_API_KEY}}" },
    routes: {
        getBalancesEVM: {
            requestMethod: "GET",
            description: "Get realtime token balances with USD valuations for native and ERC20 tokens on Avalanche Mainnet or Avalanche Fuji.",
            route: "/v1/evm/balances/{{walletAddress}}",
            parameters: [
                { position: { key: "walletAddress", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$)"] } },
                { position: { key: "chainName", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } },
                { position: { key: "limit", value: "{{USER_PARAM}}", location: "query" }, z: { primitive: "number()", options: ["min(1)", "max(1000)"] } }
            ],
            tests: [
                { _description: "Get token balances on Avalanche mainnet", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_MAINNET", limit: "10" },
                { _description: "Get token balances on Avalanche Fuji", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_FUJI", limit: "10" }
            ],
            modifiers: [
                { phase: "pre", handlerName: "insertChainIdQueryParam" }
            ]
        },
        getTransactionsEVM: {
            requestMethod: "GET",
            description: "Get detailed transaction history for an EVM address on Avalanche Mainnet or Avalanche Fuji.",
            route: "/v1/evm/transactions/{{walletAddress}}",
            parameters: [
                { position: { key: "walletAddress", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$)"] } },
                { position: { key: "chainName", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } },
                { position: { key: "limit", value: "{{USER_PARAM}}", location: "query" }, z: { primitive: "number()", options: ["min(1)", "max(100)"] } }
            ],
            tests: [
                { _description: "Get transactions on Avalanche mainnet", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_MAINNET", limit: "5" },
                { _description: "Get transactions on Avalanche Fuji", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_FUJI", limit: "5" }
            ],
            modifiers: [
                { phase: "pre", handlerName: "insertChainIdQueryParam" }
            ]
        },
        getCollectiblesEVM: {
            requestMethod: "GET",
            description: "Get NFT collectibles (ERC721/ERC1155) with metadata for a wallet address on Avalanche Mainnet or Avalanche Fuji.",
            route: "/v1/evm/collectibles/{{walletAddress}}",
            parameters: [
                { position: { key: "walletAddress", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$)"] } },
                { position: { key: "chainName", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } },
                { position: { key: "limit", value: "{{USER_PARAM}}", location: "query" }, z: { primitive: "number()", options: ["min(1)", "max(2500)"] } }
            ],
            tests: [
                { _description: "Get collectibles on Avalanche mainnet", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_MAINNET", limit: "10" },
                { _description: "Get collectibles on Avalanche Fuji", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_FUJI", limit: "10" }
            ],
            modifiers: [
                { phase: "pre", handlerName: "insertChainIdQueryParam" }
            ]
        },
        getTokenInfoEVM: {
            requestMethod: "GET",
            description: "Get token metadata (symbol/name/decimals/price/logo) for native or ERC20 tokens on Avalanche Mainnet or Avalanche Fuji.",
            route: "/v1/evm/token-info/{{tokenAddress}}",
            parameters: [
                { position: { key: "tokenAddress", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$|^native$)"] } },
                { position: { key: "chainName", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } }
            ],
            tests: [
                { _description: "Get native token info on Avalanche mainnet", tokenAddress: "native", chainName: "AVALANCHE_MAINNET" },
                { _description: "Get USDC token info on Avalanche mainnet", tokenAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", chainName: "AVALANCHE_MAINNET" },
                { _description: "Get native token info on Avalanche Fuji", tokenAddress: "native", chainName: "AVALANCHE_FUJI" }
            ],
            modifiers: [
                { phase: "pre", handlerName: "insertChainIdQueryParam" }
            ]
        },
        getTokenHoldersEVM: {
            requestMethod: "GET",
            description: "Get token holders for ERC20 or ERC721 tokens on Avalanche Mainnet or Avalanche Fuji (chain selection restricted).",
            route: "/v1/evm/token-holders/{{chain_id}}/{{token_address}}",
            parameters: [
                { position: { key: "chain_id", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } },
                { position: { key: "token_address", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$)"] } },
                { position: { key: "limit", value: "{{USER_PARAM}}", location: "query" }, z: { primitive: "number()", options: ["min(1)", "max(500)"] } }
            ],
            tests: [
                { _description: "Get USDC holders on Avalanche mainnet", chain_id: "AVALANCHE_MAINNET", token_address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", limit: "10" },
                { _description: "Get token holders on Avalanche Fuji (example token address)", chain_id: "AVALANCHE_FUJI", token_address: "0x0000000000000000000000000000000000000000", limit: "10" }
            ],
            modifiers: [
                { phase: "pre", handlerName: "mapTokenHoldersChainIdInPath" }
            ]
        },
        getActivityEVM: {
            requestMethod: "GET",
            description: `Get a paginated and summarized decoded activity feed for a wallet address, filtered to a single Avalanche chain. Allowed chains: ${supportedChainsStr}.`,
            route: "/v1/evm/activity/{{walletAddress}}",
            parameters: [
                { position: { key: "walletAddress", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$)"] } },
                { position: { key: "chainName", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } },
                { position: { key: "limit", value: "{{USER_PARAM}}", location: "query" }, z: { primitive: "number()", options: ["min(1)", "max(100)", "optional()", "default(100)"] } },
                { position: { key: "maxPages", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "number()", options: ["min(1)", "max(100)", "optional()", "default(10)"] } },
                { position: { key: "requestDelay", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "number()", options: ["min(0)", "max(10000)", "optional()", "default(500)"] } }
            ],
            tests: [
                { _description: "Summarize activity on Avalanche mainnet", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_MAINNET", limit: "50", maxPages: "5", requestDelay: "250" },
                { _description: "Summarize activity on Avalanche Fuji", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_FUJI", limit: "50", maxPages: "5", requestDelay: "250" }
            ],
            modifiers: [
                { phase: "execute", handlerName: "summarizeActivityFeedAvalanche" }
            ]
        },
        getActivityDetailedEVM: {
            requestMethod: "GET",
            description: `Get decoded activity feed for a wallet address (raw response) and filter it to a single Avalanche chain in a post-processor. Allowed chains: ${supportedChainsStr}.`,
            route: "/v1/evm/activity/{{walletAddress}}",
            parameters: [
                { position: { key: "walletAddress", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["regex(^0x[a-fA-F0-9]{40}$)"] } },
                { position: { key: "chainName", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: chainAliasEnum, options: [] } },
                { position: { key: "limit", value: "{{USER_PARAM}}", location: "query" }, z: { primitive: "number()", options: ["min(1)", "max(100)"] } }
            ],
            tests: [
                { _description: "Get raw activity and filter to Avalanche mainnet", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_MAINNET", limit: "25" },
                { _description: "Get raw activity and filter to Avalanche Fuji", walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chainName: "AVALANCHE_FUJI", limit: "25" }
            ],
            modifiers: [
                { phase: "post", handlerName: "filterActivityByChain" }
            ]
        }
    },
    handlers: {
        insertChainIdQueryParam: async ({ struct, payload, userParams }) => {
            const chainName = getParam(userParams, "chainName");
            const chainId = getChainIdByAlias(chainName);
            if (!chainId) {
                struct.status = false;
                struct.messages.push(`Unsupported chainName "${chainName}". Allowed: ${supportedChainsStr}`);
                return { struct, payload };
            }
            try {
                const url = new URL(payload.url);
                url.searchParams.set("chain_ids", String(chainId));
                payload.url = url.toString();
            } catch (e) {
                struct.status = false;
                struct.messages.push(e?.message || "Failed to build URL");
            }
            return { struct, payload };
        },
        mapTokenHoldersChainIdInPath: async ({ struct, payload, userParams }) => {
            const chainAlias = getParam(userParams, "chain_id");
            const chainId = getChainIdByAlias(chainAlias);
            if (!chainId) {
                struct.status = false;
                struct.messages.push(`Unsupported chain_id "${chainAlias}". Allowed: ${supportedChainsStr}`);
                return { struct, payload };
            }
            try {
                const url = new URL(payload.url);
                url.pathname = url.pathname.replace(`/evm/token-holders/${chainAlias}/`, `/evm/token-holders/${chainId}/`);
                payload.url = url.toString();
            } catch (e) {
                struct.status = false;
                struct.messages.push(e?.message || "Failed to build URL");
            }
            return { struct, payload };
        },
        filterActivityByChain: async ({ struct, payload, userParams }) => {
            const chainName = getParam(userParams, "chainName");
            const chainId = getChainIdByAlias(chainName);
            if (!chainId) {
                struct.status = false;
                struct.messages.push(`Unsupported chainName "${chainName}". Allowed: ${supportedChainsStr}`);
                return { struct, payload };
            }
            const data = struct.data || {};
            if (Array.isArray(data.activity)) {
                data.activity = data.activity.filter((a) => Number(a?.chain_id) === Number(chainId));
                struct.data = data;
            }
            return { struct, payload };
        },
        summarizeActivityFeedAvalanche: async ({ struct, payload, userParams }) => {
            const chainName = getParam(userParams, "chainName");
            const chainId = getChainIdByAlias(chainName);
            if (!chainId) {
                struct.status = false;
                struct.messages.push(`Unsupported chainName "${chainName}". Allowed: ${supportedChainsStr}`);
                return { struct, payload };
            }

            let limit = parseInt(String(getParam(userParams, "limit") ?? "100"), 10);
            let maxPages = parseInt(String(getParam(userParams, "maxPages") ?? "10"), 10);
            let requestDelay = parseInt(String(getParam(userParams, "requestDelay") ?? "500"), 10);

            if (!Number.isFinite(limit) || limit < 1) limit = 100;
            if (!Number.isFinite(maxPages) || maxPages < 1) maxPages = 10;
            if (!Number.isFinite(requestDelay) || requestDelay < 0) requestDelay = 500;

            try {
                const baseUrl = new URL(payload.url);
                baseUrl.searchParams.delete("maxPages");
                baseUrl.searchParams.delete("requestDelay");
                baseUrl.searchParams.set("limit", String(limit));

                const allActivities = [];
                let nextOffset = null;
                let pagesLoaded = 0;

                for (let page = 0; page < maxPages; page++) {
                    const pageUrl = new URL(baseUrl.toString());
                    if (nextOffset) pageUrl.searchParams.set("offset", String(nextOffset));

                    const response = await fetch(pageUrl.toString(), { method: "GET", headers: payload.headers });
                    if (!response.ok) {
                        struct.status = false;
                        struct.messages.push(`API call failed: ${response.status} ${response.statusText}`);
                        return { struct, payload };
                    }

                    const json = await response.json();
                    if (Array.isArray(json.activity)) allActivities.push(...json.activity);
                    nextOffset = json.next_offset || null;
                    pagesLoaded++;

                    if (!nextOffset) break;
                    if (page < maxPages - 1 && requestDelay > 0) await new Promise((r) => setTimeout(r, requestDelay));
                }

                const filtered = allActivities.filter((a) => Number(a?.chain_id) === Number(chainId));
                const summary = filtered.reduce((acc, a) => {
                    const assetType = String(a?.asset_type ?? "unknown");
                    const type = String(a?.type ?? "unknown");
                    const key = `summary_${assetType}_${type}`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});

                struct.status = true;
                struct.data = {
                    chainName,
                    chainId,
                    isComplete: !nextOffset,
                    pagesLoaded,
                    maxPagesReached: pagesLoaded >= maxPages,
                    totalActivities: filtered.length,
                    summary,
                    activitiesSample: filtered.slice(0, 25)
                };

                return { struct, payload };
            } catch (e) {
                struct.status = false;
                struct.messages.push(e?.message || "Handler error");
                struct.data = {};
                return { struct, payload };
            }
        }
    }
};


export { schema };
