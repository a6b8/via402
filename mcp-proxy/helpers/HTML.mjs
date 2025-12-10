class HTML {
    static start({
        app,
        routePath,
        suffix = 'token_validation',
        apiPath = '/api/v1/agent_payz/token_validation',
        allowedUpstreamHosts = [
            'localhost',
            'community.flowmcp.org',
            'x402.flowmcp.org'
        ]
    }) {
        const fullPath = routePath + '/' + suffix;

        app.get(fullPath, (req, res) => {
            const pageUrl =
                req.protocol + '://' + req.get('host') + fullPath;
            const apiUrl =
                req.protocol + '://' + req.get('host') + apiPath;

            return res.send(
                HTML.#getFrontpage({
                    pageUrl,
                    apiUrl,
                    allowedUpstreamHosts
                })
            );
        });
    }

    static #getFrontpage({ pageUrl, apiUrl, allowedUpstreamHosts }) {
        const configJson = JSON.stringify({ apiUrl, allowedUpstreamHosts });

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AgentPayz – Token Validation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --bg: #020617;
            --bg-card: #020617;
            --bg-elevated: #020617;
            --bg-panel: #020617;
            --border-subtle: #1f2937;
            --text-main: #e5e7eb;
            --text-muted: #9ca3af;
            --accent: #2563eb;
            --accent-soft: rgba(37,99,235,0.15);
            --danger: #ef4444;
            --success: #22c55e;
            --warning: #f97316;
            --code-bg: #020617;
            --code-border: #1f2937;
            --radius-lg: 14px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
            background: radial-gradient(circle at top left, #0f172a, #020617 55%);
            color: var(--text-main);
        }

        .app-shell {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .top-nav {
            display: flex;
            align-items: center;
            padding: 14px 32px;
            border-bottom: 1px solid var(--border-subtle);
            background: rgba(15,23,42,0.92);
            backdrop-filter: blur(14px);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .top-nav-title {
            font-weight: 600;
            margin-right: 32px;
        }

        .top-nav-tabs {
            display: flex;
            gap: 18px;
            font-size: 0.9rem;
        }

        .top-nav-tab {
            color: var(--text-muted);
            cursor: default;
            padding: 6px 0;
        }

        .top-nav-tab.active {
            color: #ffffff;
            position: relative;
            font-weight: 500;
        }

        .top-nav-tab.active::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: -8px;
            height: 2px;
            background: linear-gradient(to right, #2563eb, #38bdf8);
            border-radius: 999px;
        }

        .main {
            flex: 1;
            padding: 28px 32px 40px;
        }

        .page-header {
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            gap: 16px;
        }

        .page-title {
            font-size: 1.25rem;
            font-weight: 600;
            letter-spacing: 0.01em;
        }

        .page-subtitle {
            font-size: 0.9rem;
            color: var(--text-muted);
        }

        .endpoint-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(15,23,42,0.9);
            border: 1px solid var(--border-subtle);
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        .endpoint-chip strong {
            color: #e5e7eb;
            font-weight: 500;
        }

        .layout-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.3fr);
            gap: 20px;
        }

        @media (max-width: 900px) {
            .layout-grid {
                grid-template-columns: minmax(0, 1fr);
            }
            .main {
                padding: 20px 18px 32px;
            }
        }

        .card {
            background: radial-gradient(circle at top left, #020617, #020617 55%);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-subtle);
            padding: 18px 18px 16px;
            box-shadow: 0 18px 35px rgba(0,0,0,0.45);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .card-title {
            font-size: 0.95rem;
            font-weight: 500;
        }

        .card-subtitle {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.78rem;
            padding: 3px 9px;
            border-radius: 999px;
            border: 1px solid transparent;
        }

        .badge-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
        }

        .badge--idle {
            background: rgba(15,23,42,0.9);
            border-color: var(--border-subtle);
            color: var(--text-muted);
        }
        .badge--idle .badge-dot {
            background: var(--border-subtle);
        }

        .badge--success {
            background: rgba(22,163,74,0.1);
            border-color: rgba(34,197,94,0.8);
            color: #bbf7d0;
        }
        .badge--success .badge-dot {
            background: var(--success);
        }

        .badge--error {
            background: rgba(248,113,113,0.07);
            border-color: rgba(248,113,113,0.9);
            color: #fecaca;
        }
        .badge--error .badge-dot {
            background: var(--danger);
        }

        .badge--loading {
            background: rgba(37,99,235,0.08);
            border-color: rgba(59,130,246,0.9);
            color: #bfdbfe;
        }
        .badge--loading .badge-dot {
            background: var(--accent);
            animation: pulse 1.2s infinite ease-in-out;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(0.85); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
        }

        label {
            display: block;
            font-size: 0.8rem;
            margin-bottom: 4px;
            color: var(--text-muted);
        }

        .label-required::after {
            content: " *";
            color: #f97316;
        }

        .token-input {
            width: 100%;
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid var(--border-subtle);
            background: #020617;
            color: var(--text-main);
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.8rem;
            outline: none;
        }

        .token-input:focus {
            border-color: rgba(59,130,246,0.9);
            box-shadow: 0 0 0 1px rgba(59,130,246,0.6);
        }

        .helper-text {
            font-size: 0.76rem;
            color: var(--text-muted);
            margin-top: 4px;
        }

        .api-info {
            margin-top: 16px;
            padding: 12px 12px;
            border-radius: 10px;
            border: 1px solid rgba(148,163,184,0.25);
            background: radial-gradient(circle at top left, rgba(37,99,235,0.24), rgba(15,23,42,0.8));
            font-size: 0.8rem;
        }

        .api-info-title {
            font-weight: 500;
            margin-bottom: 6px;
        }

        .api-info ul {
            margin: 0;
            padding-left: 18px;
        }

        .api-info li {
            margin-bottom: 2px;
        }

        .primary-button {
            margin-top: 16px;
            padding: 8px 15px;
            border-radius: 999px;
            border: none;
            background: linear-gradient(to right, #2563eb, #4f46e5);
            color: white;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 12px 25px rgba(37,99,235,0.45);
        }

        .primary-button:disabled {
            opacity: 0.55;
            cursor: default;
            box-shadow: none;
        }

        .primary-button span.icon {
            width: 15px;
            height: 15px;
            border-radius: 999px;
            border: 2px solid rgba(191,219,254,0.65);
            border-top-color: white;
            animation: spin 0.8s linear infinite;
            display: none;
        }

        .primary-button.loading span.icon {
            display: inline-block;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error-box {
            margin-top: 14px;
            padding: 9px 10px;
            border-radius: 10px;
            border: 1px solid rgba(248,113,113,0.8);
            background: rgba(127,29,29,0.55);
            color: #fee2e2;
            font-size: 0.78rem;
            display: none;
        }

        .error-box strong {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
        }

        .code-panel {
            border-radius: 10px;
            background: rgba(15,23,42,0.98);
            border: 1px solid var(--code-border);
            padding: 10px 11px;
            font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            font-size: 0.78rem;
            color: #e5e7eb;
            overflow: auto;
            max-height: 220px;
        }

        .code-panel-header {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
        }

        .code-panel-header span.label {
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 0.7rem;
            color: #9ca3af;
        }

        .code-panel pre {
            margin: 0;
            white-space: pre;
        }

        .timestamp {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 10px;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="app-shell">
        <header class="top-nav">
            <div class="top-nav-title">AgentPayz Dashboard</div>
            <nav class="top-nav-tabs">
                <div class="top-nav-tab">Server Status</div>
                <div class="top-nav-tab">Tool Permission</div>
                <div class="top-nav-tab">Payment Logs</div>
                <div class="top-nav-tab">Offer Mismatches</div>
                <div class="top-nav-tab active">Token Validation</div>
            </nav>
        </header>

        <main class="main">
            <div class="page-header">
                <div>
                    <div class="page-title">Test Token Validation API</div>
                    <div class="page-subtitle">
                        This page reads the token from the URL and validates it via the AgentPayz API.
                    </div>
                </div>
                <div class="endpoint-chip">
                    <span>GET</span>
                    <strong>/api/v1/agent_payz/token_validation</strong>
                </div>
            </div>

            <div class="layout-grid">
                <!-- Left column: inputs -->
                <section class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">API Token</div>
                            <div class="card-subtitle">
                                Example URL of this page:
                                <br><code style="font-size:0.75rem;">${pageUrl}?token=&lt;YOUR_TOKEN&gt;&amp;UpstreamURL=&lt;ENCODED_URL&gt;</code>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="label-required" for="token-input">API Token</label>
                        <input id="token-input" class="token-input" placeholder="Paste your API token here">
                        <div class="helper-text">
                            The token is automatically read from the URL, but you can also change it manually here.
                        </div>

                        <div style="margin-top:16px;">
                            <label for="upstream-input">Upstream URL (allow-listed)</label>
                            <input id="upstream-input" class="token-input"
                                   placeholder="https://x402.flowmcp.org/mcp/streamable?url=...">
                            <div class="helper-text">
                                Read from the <code>UpstreamURL</code> query parameter. Allowed hosts:
                                <code>localhost</code>,
                                <code>community.flowmcp.org</code>,
                                <code>x402.flowmcp.org</code>.
                            </div>

                            <div class="helper-text" style="margin-top:8px;">
                                <span class="badge badge--idle" id="upstream-badge">
                                    <span class="badge-dot"></span>
                                    <span id="upstream-badge-text">No upstream URL checked yet.</span>
                                </span>
                            </div>

                            <div id="upstream-error-box" class="error-box" style="margin-top:10px; display:none;">
                                <strong>There is a problem with the upstream URL.</strong>
                                <span id="upstream-error-text"></span>
                            </div>
                        </div>

                        <div class="api-info">
                            <div class="api-info-title">What this API validates:</div>
                            <ul>
                                <li>Token exists in the database</li>
                                <li>Token has not been revoked</li>
                                <li>Token has not expired (if an expiry is set)</li>
                                <li>Returns basic user information when valid</li>
                            </ul>
                        </div>

                        <button id="validate-button" class="primary-button">
                            <span class="icon"></span>
                            <span>Validate token now</span>
                        </button>

                        <div id="error-box" class="error-box">
                            <strong>There was a problem.</strong>
                            <span id="error-text"></span>
                        </div>
                    </div>
                </section>

                <!-- Right column: response -->
                <section class="card">
                    <div class="card-header">
                        <div class="card-title">Response</div>
                        <div class="badge badge--idle" id="status-badge">
                            <span class="badge-dot"></span>
                            <span id="status-text">Waiting for token…</span>
                        </div>
                    </div>

                    <div class="code-panel">
                        <div class="code-panel-header">
                            <span class="label">Request</span>
                        </div>
                        <pre id="request-json">{
  "method": "GET",
  "url": "${apiUrl}",
  "query": { "token": "&lt;read from URL&gt;" }
}</pre>
                    </div>

                    <div style="height:8px;"></div>

                    <div class="code-panel">
                        <div class="code-panel-header">
                            <span class="label">Response</span>
                        </div>
                        <pre id="response-json">{
  "valid": null,
  "message": "No request has been sent yet."
}</pre>
                    </div>

                    <div class="timestamp">
                        Last updated:
                        <span id="timestamp">–</span>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <script>
        // Server-provided configuration (API URL and allowlist)
        window.__TOKEN_VALIDATION_CONFIG__ = ${configJson};
    </script>

    <script>
        (function() {
            'use strict';

            var config = window.__TOKEN_VALIDATION_CONFIG__ || {};
            var apiUrl = config.apiUrl;
            var allowedHosts = (config.allowedUpstreamHosts || []).map(function(h) {
                return String(h || '').trim().toLowerCase();
            });

            var tokenInput = document.getElementById('token-input');
            var validateButton = document.getElementById('validate-button');
            var errorBox = document.getElementById('error-box');
            var errorText = document.getElementById('error-text');
            var requestPre = document.getElementById('request-json');
            var responsePre = document.getElementById('response-json');
            var statusBadge = document.getElementById('status-badge');
            var statusText = document.getElementById('status-text');
            var timestampEl = document.getElementById('timestamp');

            var upstreamInput = document.getElementById('upstream-input');
            var upstreamBadge = document.getElementById('upstream-badge');
            var upstreamBadgeText = document.getElementById('upstream-badge-text');
            var upstreamErrorBox = document.getElementById('upstream-error-box');
            var upstreamErrorText = document.getElementById('upstream-error-text');

            function setStatus(type, text) {
                statusBadge.className = 'badge badge--' + type;
                statusText.textContent = text;
            }

            function setButtonLoading(isLoading) {
                if (!validateButton) return;
                if (isLoading) {
                    validateButton.classList.add('loading');
                    validateButton.disabled = true;
                } else {
                    validateButton.classList.remove('loading');
                    validateButton.disabled = false;
                }
            }

            function showError(message) {
                if (!errorBox || !errorText) return;
                errorText.textContent = message;
                errorBox.style.display = 'block';
            }

            function clearError() {
                if (!errorBox) return;
                errorBox.style.display = 'none';
                errorText.textContent = '';
            }

            function updateTimestamp() {
                if (!timestampEl) return;
                timestampEl.textContent = new Date().toISOString();
            }

            function renderRequest(token) {
                var obj = {
                    method: 'GET',
                    url: apiUrl,
                    query: { token: token }
                };
                requestPre.textContent = JSON.stringify(obj, null, 2);
            }

            function renderResponse(data) {
                try {
                    responsePre.textContent = JSON.stringify(data, null, 2);
                } catch (e) {
                    responsePre.textContent = String(data);
                }
            }

            function setUpstreamStatus(type, text) {
                if (!upstreamBadge || !upstreamBadgeText) return;
                upstreamBadge.className = 'badge badge--' + type;
                upstreamBadgeText.textContent = text;
            }

            function showUpstreamError(message) {
                if (!upstreamErrorBox || !upstreamErrorText) return;
                upstreamErrorText.textContent = message;
                upstreamErrorBox.style.display = 'block';
                setUpstreamStatus('error', 'Upstream host not allowed');
            }

            function clearUpstreamError() {
                if (!upstreamErrorBox || !upstreamErrorText) return;
                upstreamErrorBox.style.display = 'none';
                upstreamErrorText.textContent = '';
            }

            function validateUpstream(rawValue) {
                clearUpstreamError();

                if (!rawValue) {
                    setUpstreamStatus('idle', 'No upstream URL provided.');
                    if (upstreamInput) upstreamInput.value = '';
                    return;
                }

                var decoded = rawValue;
                try {
                    decoded = decodeURIComponent(rawValue);
                } catch (e) {
                    // ignore if already decoded
                }

                if (upstreamInput) {
                    upstreamInput.value = decoded;
                }

                var urlObj;
                try {
                    urlObj = new URL(decoded);
                } catch (e) {
                    showUpstreamError('The upstream URL is not valid. Please check that it is complete (including "https://").');
                    return;
                }

                var hostname = (urlObj.hostname || '').toLowerCase();
                var isAllowed = allowedHosts.indexOf(hostname) !== -1;

                if (isAllowed) {
                    clearUpstreamError();
                    setUpstreamStatus('success', 'Upstream host allowed: ' + hostname + ' \u2713');
                } else {
                    var msg = 'The host "' + hostname +
                        '" is not on the allowlist. Allowed hosts are: ' + allowedHosts.join(', ') + '.';
                    showUpstreamError(msg);
                }
            }

            function validateToken(token) {
                if (!apiUrl) {
                    showError('The API URL is not configured.');
                    setStatus('error', 'Configuration error');
                    return;
                }

                token = (token || '').trim();

                if (!token) {
                    showError('No token was provided. Please add "?token=YOUR_TOKEN" to the URL or enter the token in the input field.');
                    setStatus('error', 'No token provided');
                    renderRequest('<no token>');
                    renderResponse({ error: 'No token provided' });
                    return;
                }

                clearError();
                setStatus('loading', 'Validating token…');
                setButtonLoading(true);
                renderRequest(token);
                updateTimestamp();

                var urlWithQuery = apiUrl + '?token=' + encodeURIComponent(token);

                fetch(urlWithQuery, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                .then(function(res) {
                    if (!res.ok) {
                        return res.json().catch(function() {
                            return { message: 'Unknown error from server.', status: res.status };
                        }).then(function(body) {
                            throw { status: res.status, body: body };
                        });
                    }
                    return res.json();
                })
                .then(function(data) {
                    renderResponse(data);

                    if (data && data.valid) {
                        setStatus('success', 'Token is valid');
                    } else {
                        var msg = (data && data.message) || 'Token is invalid.';
                        showError(msg);
                        setStatus('error', 'Token is invalid');
                    }
                })
                .catch(function(err) {
                    var msg = 'An error occurred while validating the token.';

                    if (err && err.body && err.body.message) {
                        msg += ' ' + err.body.message;
                    } else if (err && err.status) {
                        msg += ' (HTTP status: ' + err.status + ')';
                    }

                    showError(msg);

                    if (err && err.body) {
                        renderResponse(err.body);
                    } else {
                        renderResponse({ error: String(err) });
                    }

                    setStatus('error', 'Error');
                })
                .finally(function() {
                    setButtonLoading(false);
                });
            }

            function initFromUrl() {
                var params;
                try {
                    params = new URLSearchParams(window.location.search);
                } catch (e) {
                    params = null;
                }

                var tokenFromUrl = params ? (params.get('token') || '') : '';

                var upstreamRaw = '';
                if (params) {
                    upstreamRaw =
                        params.get('UpstreamURL') ||
                        params.get('upstreamURL') ||
                        params.get('upstreamUrl') ||
                        '';
                }

                // Always validate upstream URL first
                validateUpstream(upstreamRaw);

                if (tokenInput) {
                    tokenInput.value = tokenFromUrl;
                }

                if (tokenFromUrl) {
                    validateToken(tokenFromUrl);
                } else {
                    showError('No token was found in the URL. Please add "?token=YOUR_TOKEN" or enter the token manually.');
                    setStatus('idle', 'Waiting for token…');
                }
            }

            if (validateButton) {
                validateButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    var token = tokenInput ? tokenInput.value : '';

                    try {
                        var url = new URL(window.location.href);
                        url.searchParams.set('token', token);
                        window.history.replaceState({}, '', url.toString());
                    } catch (e) {
                        // ignore – convenience only
                    }

                    validateToken(token);
                });
            }

            if (upstreamInput) {
                upstreamInput.addEventListener('blur', function() {
                    validateUpstream(upstreamInput.value);
                });
            }

            initFromUrl();
        })();
    </script>
</body>
</html>`;

        return html;
    }
}

export { HTML };
