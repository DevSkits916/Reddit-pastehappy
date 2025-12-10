// ==UserScript==
// @name         Reddit Explore Exporter Pro (UI & Logs)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Export Reddit communities to CSV with a clean UI, logs, and filters.
// @author       Gemini
// @match        https://www.reddit.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- State Management ---
    let scrapedData = new Map(); // Stores unique communities
    let uiVisible = false;

    // --- CSS Styles ---
    const styles = `
        #rex-toggle-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
            padding: 10px 15px;
            background-color: #ff4500;
            color: white;
            border: none;
            border-radius: 50px;
            font-weight: bold;
            font-family: sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            transition: transform 0.2s;
        }
        #rex-toggle-btn:hover { transform: scale(1.05); }

        #rex-panel {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 350px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: none; /* Hidden by default */
            flex-direction: column;
            overflow: hidden;
        }
        
        .rex-header {
            background: #f6f7f8;
            padding: 12px 16px;
            border-bottom: 1px solid #edeff1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .rex-header h3 { margin: 0; font-size: 16px; color: #1c1c1c; }
        .rex-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #878a8c; }
        .rex-close:hover { color: #1c1c1c; }

        .rex-body { padding: 16px; }

        .rex-section { margin-bottom: 15px; }
        .rex-label { display: block; font-size: 12px; font-weight: 700; color: #878a8c; margin-bottom: 5px; text-transform: uppercase; }
        
        /* Filters */
        .rex-filter-group { display: flex; gap: 10px; margin-bottom: 8px; }
        .rex-checkbox-label { font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; color: #1c1c1c; }
        .rex-input { width: 100%; padding: 8px; border: 1px solid #edeff1; border-radius: 4px; font-size: 13px; box-sizing: border-box; }

        /* Buttons */
        .rex-btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 8px;
            transition: background 0.2s;
        }
        .rex-btn-primary { background: #0079d3; color: white; }
        .rex-btn-primary:hover { background: #005fa3; }
        .rex-btn-secondary { background: #edeff1; color: #1c1c1c; }
        .rex-btn-secondary:hover { background: #e0e2e4; }
        .rex-btn:disabled { background: #ccc; cursor: not-allowed; }

        /* Log Area */
        .rex-log-container {
            background: #1a1a1b;
            color: #d7dadc;
            padding: 10px;
            height: 120px;
            overflow-y: auto;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
            border: 1px solid #343536;
        }
        .log-entry { margin-bottom: 4px; border-bottom: 1px solid #343536; padding-bottom: 2px; }
        .log-time { color: #878a8c; margin-right: 5px; }
        .log-success { color: #46d160; }
        .log-warn { color: #f6c00e; }
        
        .rex-stats { font-size: 12px; color: #1c1c1c; text-align: center; margin-top: 5px; }
    `;

    // Inject CSS
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- UI Construction ---
    function createUI() {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'rex-toggle-btn';
        toggleBtn.innerText = 'Explore Exporter';
        toggleBtn.onclick = togglePanel;
        document.body.appendChild(toggleBtn);

        const panel = document.createElement('div');
        panel.id = 'rex-panel';
        panel.innerHTML = `
            <div class="rex-header">
                <h3>Export Settings</h3>
                <button class="rex-close" id="rex-close-btn">&times;</button>
            </div>
            <div class="rex-body">
                <div class="rex-section">
                    <button id="rex-scan-btn" class="rex-btn rex-btn-secondary">Scan Page for Communities</button>
                    <div class="rex-stats" id="rex-stats">Ready to scan.</div>
                </div>

                <div class="rex-section">
                    <span class="rex-label">Filters</span>
                    <div class="rex-filter-group">
                        <label class="rex-checkbox-label"><input type="checkbox" id="rex-chk-joined" checked> Joined</label>
                        <label class="rex-checkbox-label"><input type="checkbox" id="rex-chk-not" checked> Not Joined</label>
                        <label class="rex-checkbox-label"><input type="checkbox" id="rex-chk-unknown" checked> Unknown</label>
                    </div>
                    <input type="text" id="rex-name-filter" class="rex-input" placeholder="Filter by name (e.g., 'tech')...">
                </div>

                <div class="rex-section">
                    <span class="rex-label">Activity Log</span>
                    <div class="rex-log-container" id="rex-log"></div>
                </div>

                <button id="rex-export-btn" class="rex-btn rex-btn-primary" disabled>Export CSV</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Event Listeners
        document.getElementById('rex-close-btn').onclick = togglePanel;
        document.getElementById('rex-scan-btn').onclick = runScan;
        document.getElementById('rex-export-btn').onclick = runExport;
        
        // Update stats when filters change
        ['rex-chk-joined', 'rex-chk-not', 'rex-chk-unknown', 'rex-name-filter'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateStats);
        });
    }

    // --- Logic Functions ---

    function togglePanel() {
        const panel = document.getElementById('rex-panel');
        uiVisible = !uiVisible;
        panel.style.display = uiVisible ? 'flex' : 'none';
        if(uiVisible) updateStats();
    }

    function log(msg, type = 'info') {
        const logContainer = document.getElementById('rex-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString().split(' ')[0];
        let colorClass = '';
        if (type === 'success') colorClass = 'log-success';
        if (type === 'warn') colorClass = 'log-warn';

        entry.innerHTML = `<span class="log-time">[${time}]</span><span class="${colorClass}">${msg}</span>`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function runScan() {
        log("Scanning visible page area...", "info");
        const links = document.querySelectorAll('a[href^="/r/"]');
        let newCount = 0;

        links.forEach(link => {
            const href = link.getAttribute('href');
            const cleanUrl = href.split('?')[0].replace(/\/$/, '');
            const parts = cleanUrl.split('/');

            // Validate it is a subreddit link: /r/Name
            if (parts.length === 3 && parts[1] === 'r') {
                const name = parts[2];
                const fullUrl = `https://www.reddit.com${cleanUrl}/`;

                // Determine Membership
                let status = "Unknown";
                
                // Look for closest container (handling Reddit's various layouts)
                const container = link.closest('li, div[class*="ListItem"], shreddit-subreddit-card, div.subreddit-card, div');
                
                if (container) {
                    // Check standard buttons
                    const buttons = container.querySelectorAll('button');
                    // Check shadow DOM components if present (rare in list views but possible)
                    const shadowButtons = container.shadowRoot ? container.shadowRoot.querySelectorAll('button') : [];

                    const allButtons = [...buttons, ...shadowButtons];

                    for (let b of allButtons) {
                        const text = (b.innerText || "").toLowerCase();
                        const label = (b.getAttribute('aria-label') || "").toLowerCase();
                        
                        // "Join" = Not Member
                        if (text === 'join' || label.includes('join r/')) {
                            status = "Not Joined";
                            break;
                        } 
                        // "Joined" / "Leave" = Member
                        else if (text === 'joined' || text === 'leave' || label.includes('joined') || label.includes('leave')) {
                            status = "Joined";
                            break;
                        }
                    }
                }

                // Add or Update
                if (!scrapedData.has(fullUrl)) {
                    scrapedData.set(fullUrl, { name, url: fullUrl, status });
                    newCount++;
                } else {
                    // Update status if it was unknown previously
                    const existing = scrapedData.get(fullUrl);
                    if (existing.status === "Unknown" && status !== "Unknown") {
                        scrapedData.set(fullUrl, { name, url: fullUrl, status });
                    }
                }
            }
        });

        if (newCount > 0) {
            log(`Found ${newCount} new communities.`, "success");
        } else {
            log(`Scan complete. No new items found. Scroll down?`, "warn");
        }
        
        updateStats();
    }

    function getFilteredData() {
        const includeJoined = document.getElementById('rex-chk-joined').checked;
        const includeNot = document.getElementById('rex-chk-not').checked;
        const includeUnknown = document.getElementById('rex-chk-unknown').checked;
        const textFilter = document.getElementById('rex-name-filter').value.toLowerCase();

        return Array.from(scrapedData.values()).filter(item => {
            // Status Filter
            if (item.status === "Joined" && !includeJoined) return false;
            if (item.status === "Not Joined" && !includeNot) return false;
            if (item.status === "Unknown" && !includeUnknown) return false;
            
            // Name Filter
            if (textFilter && !item.name.toLowerCase().includes(textFilter)) return false;

            return true;
        });
    }

    function updateStats() {
        const total = scrapedData.size;
        const filtered = getFilteredData().length;
        
        const statText = document.getElementById('rex-stats');
        const exportBtn = document.getElementById('rex-export-btn');

        statText.innerText = `Total Scraped: ${total} | Matches Filter: ${filtered}`;
        
        if (filtered > 0) {
            exportBtn.disabled = false;
            exportBtn.innerText = `Export ${filtered} Communities`;
        } else {
            exportBtn.disabled = true;
            exportBtn.innerText = "Export CSV";
        }
    }

    function runExport() {
        const data = getFilteredData();
        if (data.length === 0) {
            log("Nothing to export based on current filters.", "warn");
            return;
        }

        const headers = ['Community Name', 'URL', 'Member Status'];
        const csvContent = [
            headers.join(','),
            ...data.map(item => `${item.name},${item.url},${item.status}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reddit_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        log(`Successfully exported ${data.length} rows!`, "success");
    }

    // Initialize
    createUI();

})();
