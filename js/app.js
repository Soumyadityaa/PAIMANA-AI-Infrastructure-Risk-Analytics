let projectData = [];
let modelMetrics = null;
let financialChartInstance = null;
let driverChartInstance = null;
let benchmarkChartInstance = null;
let currentFilteredData = [];
let currentPage = 1;
const rowsPerPage = 20;
const API_BASE_URL = 'http://127.0.0.1:8000';

window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`);
        if (!response.ok) throw new Error(`HTTP error!`);
        projectData = await response.json();
        
        const metricsRes = await fetch(`${API_BASE_URL}/api/model-metrics`);
        if (metricsRes.ok) modelMetrics = await metricsRes.json();
    } catch (error) { console.warn("Backend API fetch failed.", error); }

    initDashboardPage();
    initPredictiveModelsPage();
    initBenchmarkingPage();
    initEarlyWarningsPage();
    initPrescriptiveAdminPage();
    initLLMAssistant();
});

// --- DASHBOARD ---
function initDashboardPage() {
    const tableBody = document.getElementById('dashboard-table-body');
    if (!tableBody) return;
    currentFilteredData = projectData;

    updateDashboardKPIs();
    renderFinancialOverviewChart();
    renderDashboardTable(); 
    renderTicker(); 
    if (typeof initMap === 'function') initMap();

    const filters = ['filter-sector', 'filter-risk'].map(id => document.getElementById(id));
    const search = document.getElementById('search-input');

    const updateFilters = () => {
        const sector = filters[0] ? filters[0].value : 'All';
        const risk = filters[1] ? filters[1].value : 'All';
        const term = search ? search.value.toLowerCase().trim() : '';

        currentFilteredData = projectData.filter(p => 
            (sector === 'All' || p.sector === sector) &&
            (risk === 'All' || p.risk.toLowerCase() === risk.toLowerCase()) &&
            (p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term))
        );
        currentPage = 1;
        renderDashboardTable();
    };

    filters.forEach(f => { if(f) f.addEventListener('change', updateFilters); });
    if(search) search.addEventListener('input', updateFilters);
}

function updateDashboardKPIs() {
    if (document.getElementById('kpi-total')) document.getElementById('kpi-total').innerText = projectData.length;
    if (document.getElementById('kpi-high-risk')) document.getElementById('kpi-high-risk').innerText = projectData.filter(p => p.risk === 'high').length;
    if (document.getElementById('kpi-cost-overrun')) {
        let overrun = 0;
        projectData.forEach(p => { if (p.revisedCost > p.originalCost) overrun += (p.revisedCost - p.originalCost); });
        document.getElementById('kpi-cost-overrun').innerText = `₹${(overrun / 100000).toFixed(2)} L Cr`;
    }
}

function renderFinancialOverviewChart() {
    const canvas = document.getElementById('financialOverviewChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const sectorAggs = {};
    projectData.forEach(p => {
        if (!sectorAggs[p.sector]) sectorAggs[p.sector] = { orig: 0, rev: 0 };
        sectorAggs[p.sector].orig += p.originalCost || 0;
        sectorAggs[p.sector].rev += p.revisedCost || 0;
    });

    const labels = Object.keys(sectorAggs);
    if (financialChartInstance) financialChartInstance.destroy();

    financialChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Orig. Cost (₹k Cr)', data: labels.map(l => (sectorAggs[l].orig/1000).toFixed(1)), backgroundColor: '#0284c7' },
                { label: 'Rev. Cost (₹k Cr)', data: labels.map(l => (sectorAggs[l].rev/1000).toFixed(1)), backgroundColor: '#ef4444' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDashboardTable() {
    const body = document.getElementById('dashboard-table-body');
    if (!body) return;
    body.innerHTML = '';
    
    if (currentFilteredData.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;">No projects found.</td></tr>`;
        renderPagination(0);
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    currentFilteredData.slice(start, start + rowsPerPage).forEach(proj => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${proj.id}</strong><br><span style="font-size:0.85rem;color:#64748b;">${proj.name}</span></td>
            <td>${proj.sector}</td>
            <td><div style="font-size:0.85rem;">${proj.progress}%</div><div style="background:#e2e8f0;height:6px;width:100px;"><div style="background:#1e3a8a;height:100%;width:${Math.min(proj.progress,100)}%;"></div></div></td>
            <td><span class="badge ${proj.risk}">${proj.risk.toUpperCase()}</span></td>
            <td>${proj.delay > 0 ? `<span style="color:#ef4444;font-weight:600;">${proj.delay} Mo</span>` : `<span style="color:#10b981;font-weight:600;">On Track</span>`}</td>
        `;
        row.addEventListener('click', () => showModal(proj));
        body.appendChild(row);
    });
    renderPagination(currentFilteredData.length);
}

function renderPagination(total) {
    const cont = document.getElementById('pagination-controls');
    if (!cont) return;
    cont.innerHTML = '';
    const pages = Math.ceil(total / rowsPerPage);
    if (pages <= 1) return;

    const addBtn = (p, text, cls='') => {
        const b = document.createElement('button');
        b.className = `page-btn ${cls} ${p===currentPage ? 'active':''}`;
        b.innerText = text;
        b.onclick = () => { currentPage = p; renderDashboardTable(); };
        cont.appendChild(b);
    };

    addBtn(Math.max(1, currentPage-1), '<', 'arrow');
    addBtn(1, '1');
    if(currentPage > 3) cont.insertAdjacentHTML('beforeend', '<span class="page-dots">...</span>');
    for(let i = Math.max(2, currentPage-1); i <= Math.min(pages-1, currentPage+1); i++) addBtn(i, i);
    if(currentPage < pages - 2) cont.insertAdjacentHTML('beforeend', '<span class="page-dots">...</span>');
    if(pages > 1) addBtn(pages, pages);
    addBtn(Math.min(pages, currentPage+1), '>', 'arrow');
}

function renderTicker() {
    const feed = document.getElementById('live-ticker-feed');
    if (!feed) return;
    let html = '';
    projectData.filter(p => p.risk === 'high').slice(0, 6).forEach((p, i) => {
        html += `<div style="margin-bottom:15px;padding-bottom:15px;border-bottom:1px solid #e2e8f0;"><div style="font-size:0.8rem;color:#64748b;">${i*12} mins ago</div><div style="font-size:0.9rem;"><span style="color:#ef4444;">● [CRITICAL]</span> <strong>${p.id}</strong> delayed by ${p.delay} months.</div></div>`;
    });
    feed.innerHTML = html;
}

function initMap() {
    const mapContainer = document.getElementById('riskMap');
    if (!mapContainer || typeof L === 'undefined') return;
    const map = L.map('riskMap').setView([22.5937, 78.9629], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

    projectData.forEach(p => {
        if(p.lat && p.lng) {
            L.circleMarker([p.lat, p.lng], { radius:6, fillColor: p.risk==='high'?'#ef4444':p.risk==='medium'?'#f59e0b':'#10b981', color:'#fff', weight:1, fillOpacity:0.8 }).addTo(map).bindPopup(`<b>${p.id}</b><br>${p.sector}<br>${p.risk.toUpperCase()}`);
        }
    });
}

function showModal(proj) {
    const m = document.getElementById('project-modal');
    if(!m) return;
    document.getElementById('modal-title').innerText = `${proj.id} Overview`;
    document.getElementById('modal-body').innerHTML = `<h4>${proj.name}</h4><p>State: ${proj.state}</p><br><p>Orig Cost: ₹${proj.originalCost} Cr | Rev Cost: ₹${proj.revisedCost} Cr</p><p>Predicted Delay: ${proj.delay} Mo</p>`;
    m.style.display = 'flex';
}
function closeModal() { document.getElementById('project-modal').style.display = 'none'; }
window.addEventListener('click', (e) => { if(e.target === document.getElementById('project-modal')) closeModal(); });

// --- ANALYTICS PAGES ---
function initPredictiveModelsPage() {
    const c = document.getElementById('driverChart');
    if(!c || !modelMetrics) return;
    driverChartInstance = new Chart(c, {
        type: 'bar',
        data: { labels: modelMetrics.feature_names, datasets: [{ label: 'Feature Weight', data: modelMetrics.feature_weights, backgroundColor: '#3b82f6' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function initBenchmarkingPage() {
    const c = document.getElementById('benchmarkChart');
    if(!c || !modelMetrics) return;
    benchmarkChartInstance = new Chart(c, {
        type: 'radar',
        data: {
            labels: modelMetrics.benchmarking.labels,
            datasets: [
                { label: 'Augmented ML', data: modelMetrics.benchmarking.ml_scores, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                { label: 'Baseline', data: modelMetrics.benchmarking.baseline_scores, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function initEarlyWarningsPage() {
    const c = document.getElementById('alerts-page-container');
    if(!c) return;
    const filter = document.getElementById('alert-filter-risk');
    const load = (f) => {
        c.innerHTML = '';
        projectData.filter(p => p.risk !== 'low' && (f==='All' || p.risk === f)).forEach(p => {
            const bc = p.risk==='high'?'#ef4444':'#f59e0b';
            c.innerHTML += `<div class="alert-item" style="border-left-color:${bc}"><div><b>${p.name}</b><br>Delay: ${p.delay} Mo</div><a href="prescriptive-admin.html?selected=${p.id}" class="export-btn" style="background:#f8fafc;color:#1e3a8a;border:1px solid #e2e8f0;text-decoration:none;">Simulate Fix</a></div>`;
        });
    };
    if(filter) filter.addEventListener('change', () => load(filter.value));
    load('All');
}

function initPrescriptiveAdminPage() {
    const sel = document.getElementById('sim-project-select');
    if(!sel) return;
    projectData.forEach(p => { sel.innerHTML += `<option value="${p.id}">${p.id}: ${p.name.substring(0,40)}...</option>`; });
    
    const qs = new URLSearchParams(window.location.search).get('selected');
    if(qs) sel.value = qs;

    const run = async () => {
        const p = projectData.find(x => x.id === sel.value);
        if(!p) return;
        
        const fund = document.getElementById('sim-funding-slider').value;
        const clr = document.getElementById('sim-clearance-select').value;
        document.getElementById('sim-funding-val').innerText = `+${fund}%`;
        
        let simDel = p.delay;
        if(fund >= 20) simDel = Math.max(0, simDel-4);
        if(clr === 'expedited') simDel = Math.max(0, simDel-5);
        
        document.getElementById('sim-current-delay').innerText = `${p.delay} Mo`;
        document.getElementById('sim-simulated-delay').innerText = `${simDel} Mo`;

        const res = await fetch(`${API_BASE_URL}/api/predict`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sector: p.sector, historical_reliability_score: 0.85, original_cost_crore: p.originalCost, physical_progress_pct: Math.min(100, p.progress + (fund*0.2)), reported_roadblocks: clr==='expedited'?'None':p.alert })
        });
        const d = await res.json();
        document.getElementById('sim-predicted-overrun').innerText = `₹${d.predicted_cost_overrun_cr} Cr`;
    };
    
    ['sim-project-select', 'sim-funding-slider', 'sim-clearance-select'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', run);
    });
    run();
}

function initLLMAssistant() {
    const btn = document.getElementById('chat-send-btn');
    const inp = document.getElementById('chat-input-field');
    if(!btn || !inp) return;

    const send = async () => {
        const q = inp.value.trim();
        if(!q) return;
        const hist = document.getElementById('chat-history');
        hist.innerHTML += `<div class="msg user">${q}</div>`;
        inp.value = '';

        try {
            // THE REAL ML API CONNECTION (REPLACES MOCK)
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({query: q})
            });
            const data = await res.json();
            hist.innerHTML += `<div class="msg bot">${data.response}</div>`;
        } catch(e) {
            hist.innerHTML += `<div class="msg bot" style="color:red;">Error connecting to True Data Engine.</div>`;
        }
        hist.scrollTop = hist.scrollHeight;
    };
    btn.onclick = send;
    inp.onkeypress = e => { if(e.key === 'Enter') send(); };
}