// ═══════════════════════════════════════════════════════════════
// views.js — Tab view compositions for Global Country Insights
// ═══════════════════════════════════════════════════════════════

// ─── Shared state ──────────────────────────────────────────────
let overviewContinent = 'All';
let overviewSearch = '';
let overviewMetric = 'gdp';

let rankingsContinent = 'All';
let rankingsSearch = '';
let rankingsCategory = 'all';
let rankingsSortKey = 'gdp';
let rankingsSortDir = 'desc';

let deepdiveCountry = null;

let compareCountries = [];
const MAX_COMPARE = 4;

let scatterX = 'gdpPerCapita';
let scatterY = 'lifeExpectancy';
let scatterSize = 'population';
let scatterTrendline = true;

// ─── Helper: filter countries ──────────────────────────────────
function filterCountries(continent, search) {
    let data = COUNTRIES;
    if (continent && continent !== 'All') {
        data = data.filter(c => c.continent === continent);
    }
    if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        data = data.filter(c => c.name.toLowerCase().includes(q));
    }
    return data;
}

// ─── Helper: build continent filter buttons ────────────────────
function buildContinentFilters(containerId, activeCont, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const conts = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
    conts.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'btn-filter' + (activeCont === c ? ' active' : '');
        btn.textContent = c;
        if (c !== 'All' && CONTINENTS[c]) {
            btn.style.setProperty('--filter-color', CONTINENTS[c].color);
        }
        btn.addEventListener('click', () => onSelect(c));
        el.appendChild(btn);
    });
}

// ─── Helper: build metric select options ───────────────────────
function buildMetricOptions(selectId, selectedKey, excludeKeys) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    const categories = {};
    Object.entries(METRICS).forEach(([key, meta]) => {
        if (excludeKeys && excludeKeys.includes(key)) return;
        if (!categories[meta.category]) categories[meta.category] = [];
        categories[meta.category].push({ key, ...meta });
    });
    Object.entries(categories).forEach(([cat, metrics]) => {
        const group = document.createElement('optgroup');
        group.label = cat;
        metrics.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.key;
            opt.textContent = m.label + (m.unit ? ` (${m.unit})` : '');
            if (m.key === selectedKey) opt.selected = true;
            group.appendChild(opt);
        });
        sel.appendChild(group);
    });
}

// ─── Helper: format values simply ──────────────────────────────
function fmtCompact(num) {
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
}


// ═══════════════════════════════════════════════════════════════
// TAB 1: GLOBAL OVERVIEW
// ═══════════════════════════════════════════════════════════════

function getContinentAggregatedData(data, metricKey) {
    const sumMetrics = ['gdp', 'exports', 'taxRevenue', 'population', 'internetUsers', 'uhnw', 'global500', 'qsTop500', 'fdi', 'co2Emissions'];
    const isSum = sumMetrics.includes(metricKey);

    const groups = {};
    data.forEach(c => {
        const cont = c.continent;
        const val = c[metricKey];
        if (val != null && !isNaN(val)) {
            if (!groups[cont]) groups[cont] = { sum: 0, count: 0, continent: cont };
            groups[cont].sum += val;
            groups[cont].count += 1;
        }
    });

    const result = [];
    Object.keys(groups).forEach(cont => {
        const item = groups[cont];
        const val = isSum ? item.sum : (item.count > 0 ? item.sum / item.count : 0);
        const flag = CONTINENTS[cont] && CONTINENTS[cont].flag ? CONTINENTS[cont].flag : '🌍';
        result.push({
            name: cont,
            continent: cont,
            flag: flag,
            [metricKey]: val
        });
    });
    return result;
}

function renderOverview() {
    const data = filterCountries(overviewContinent, overviewSearch);

    // KPI Cards
    const totalGDP = data.reduce((s, c) => s + (c.gdp || 0), 0);
    const totalPop = data.reduce((s, c) => s + (c.population || 0), 0);
    const validHDI = data.filter(c => c.hdi != null && !isNaN(c.hdi));
    const avgHDI = validHDI.length ? (validHDI.reduce((s, c) => s + c.hdi, 0) / validHDI.length) : 0;
    const validLife = data.filter(c => c.lifeExpectancy != null && !isNaN(c.lifeExpectancy));
    const avgLife = validLife.length ? (validLife.reduce((s, c) => s + c.lifeExpectancy, 0) / validLife.length) : 0;
    const validDem = data.filter(c => c.democracyIndex != null && !isNaN(c.democracyIndex));
    const avgDem = validDem.length ? (validDem.reduce((s, c) => s + c.democracyIndex, 0) / validDem.length) : 0;

    document.getElementById('kpi-gdp-value').textContent = fmtCompact(totalGDP * 1e9);
    document.getElementById('kpi-pop-value').textContent = (totalPop / 1000).toFixed(2) + 'B';
    document.getElementById('kpi-hdi-value').textContent = avgHDI.toFixed(3);
    document.getElementById('kpi-life-value').textContent = avgLife.toFixed(1) + ' yrs';
    document.getElementById('kpi-dem-value').textContent = avgDem.toFixed(2);
    document.getElementById('kpi-count-value').textContent = data.length;

    // Bar chart title
    const metricLabel = METRICS[overviewMetric] ? METRICS[overviewMetric].label : overviewMetric;
    document.getElementById('bar-chart-title').textContent = 'Top 10 by ' + metricLabel;

    // Charts
    if (data.length > 0) {
        const continentData = getContinentAggregatedData(data, overviewMetric);
        createDonutChart('overview-donut', continentData, overviewMetric, { showLabels: false, showLegend: true });
        createBarChart('overview-bar', data, overviewMetric, { limit: 10, showFlags: true });
    } else {
        destroyChart('overview-donut');
        destroyChart('overview-bar');
    }
}

function initOverview() {
    const onContinent = (c) => {
        overviewContinent = c;
        buildContinentFilters('overview-continents', overviewContinent, onContinent);
        renderOverview();
    };
    buildContinentFilters('overview-continents', overviewContinent, onContinent);

    // Metric selector
    document.getElementById('overview-metric').addEventListener('change', (e) => {
        overviewMetric = e.target.value;
        renderOverview();
    });

    // Search
    document.getElementById('overview-search').addEventListener('input', (e) => {
        overviewSearch = e.target.value;
        renderOverview();
    });

    renderOverview();
}


// ═══════════════════════════════════════════════════════════════
// TAB 2: COUNTRY RANKINGS
// ═══════════════════════════════════════════════════════════════

function renderRankings() {
    const data = filterCountries(rankingsContinent, rankingsSearch);

    // Determine visible metrics based on category
    let visibleMetrics;
    if (rankingsCategory === 'all') {
        visibleMetrics = ['gdp', 'gdpPerCapita', 'hdi', 'lifeExpectancy', 'safetyIndex',
            'democracyIndex', 'corruptionIndex', 'population', 'tfr'];
    } else {
        visibleMetrics = Object.entries(METRICS)
            .filter(([k, m]) => m.category === rankingsCategory)
            .map(([k]) => k);
    }

    // Sort data
    const sorted = [...data].sort((a, b) => {
        const va = a[rankingsSortKey] || 0;
        const vb = b[rankingsSortKey] || 0;
        return rankingsSortDir === 'desc' ? vb - va : va - vb;
    });

    // Build table header
    const thead = document.getElementById('rankings-thead');
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');

    const thRank = document.createElement('th');
    thRank.textContent = '#';
    thRank.style.width = '40px';
    headerRow.appendChild(thRank);

    const thCountry = document.createElement('th');
    thCountry.textContent = 'Country';
    thCountry.style.minWidth = '140px';
    headerRow.appendChild(thCountry);

    visibleMetrics.forEach(key => {
        const meta = METRICS[key];
        if (!meta) return;
        const th = document.createElement('th');
        th.className = 'sortable-th' + (rankingsSortKey === key ? ' sorted' : '');
        th.innerHTML = `${meta.label} ${rankingsSortKey === key ? (rankingsSortDir === 'desc' ? '▼' : '▲') : ''}`;
        th.title = meta.description || meta.label;
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            if (rankingsSortKey === key) {
                rankingsSortDir = rankingsSortDir === 'desc' ? 'asc' : 'desc';
            } else {
                rankingsSortKey = key;
                rankingsSortDir = meta.higherIsBetter ? 'desc' : 'asc';
            }
            renderRankings();
        });
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    // Build table body
    const tbody = document.getElementById('rankings-tbody');
    tbody.innerHTML = '';

    // Compute min/max for heat coloring
    const ranges = {};
    visibleMetrics.forEach(key => {
        const values = data.map(c => c[key]).filter(v => v != null && !isNaN(v));
        ranges[key] = { min: Math.min(...values), max: Math.max(...values) };
    });

    sorted.forEach((country, i) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => {
            // Navigate to deep dive
            deepdiveCountry = country;
            const ddSelect = document.getElementById('deepdive-country');
            if (ddSelect) ddSelect.value = country.name;
            switchTab('deepdive');
        });

        const tdRank = document.createElement('td');
        tdRank.textContent = i + 1;
        tdRank.style.color = 'var(--text-muted)';
        tr.appendChild(tdRank);

        const tdName = document.createElement('td');
        tdName.innerHTML = `<span style="margin-right:6px">${country.flag}</span>${country.name}`;
        tdName.style.fontWeight = '500';
        tr.appendChild(tdName);

        visibleMetrics.forEach(key => {
            const td = document.createElement('td');
            const val = country[key];
            const meta = METRICS[key];

            if (val == null || isNaN(val)) {
                td.textContent = '—';
                td.style.color = 'var(--text-muted)';
            } else {
                td.textContent = typeof formatMetricValue === 'function'
                    ? formatMetricValue(val, key) : val.toLocaleString();

                // Heat coloring
                const range = ranges[key];
                if (range && range.max !== range.min) {
                    let ratio = (val - range.min) / (range.max - range.min);
                    if (meta && !meta.higherIsBetter) ratio = 1 - ratio;
                    if (ratio >= 0.7) td.className = 'cell-good';
                    else if (ratio <= 0.3) td.className = 'cell-poor';
                    else td.className = 'cell-moderate';
                }
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function initRankings() {
    const onContinent = (c) => {
        rankingsContinent = c;
        buildContinentFilters('rankings-continents', rankingsContinent, onContinent);
        renderRankings();
    };
    buildContinentFilters('rankings-continents', rankingsContinent, onContinent);

    document.getElementById('rankings-search').addEventListener('input', (e) => {
        rankingsSearch = e.target.value;
        renderRankings();
    });

    document.getElementById('rankings-category').addEventListener('change', (e) => {
        rankingsCategory = e.target.value;
        // Reset sort to first visible metric
        if (rankingsCategory !== 'all') {
            const firstKey = Object.entries(METRICS)
                .find(([k, m]) => m.category === rankingsCategory);
            if (firstKey) {
                rankingsSortKey = firstKey[0];
                rankingsSortDir = firstKey[1].higherIsBetter ? 'desc' : 'asc';
            }
        } else {
            rankingsSortKey = 'gdp';
            rankingsSortDir = 'desc';
        }
        renderRankings();
    });

    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const data = filterCountries(rankingsContinent, rankingsSearch);
            exportToCSV(data, `country_rankings_${rankingsCategory}_${rankingsContinent}.csv`);
        });
    }

    renderRankings();
}


// ═══════════════════════════════════════════════════════════════
// TAB 3: COUNTRY DEEP DIVE
// ═══════════════════════════════════════════════════════════════

function renderDeepDive() {
    const c = deepdiveCountry;
    if (!c) {
        document.getElementById('dd-name').textContent = 'Select a country above';
        document.getElementById('dd-flag').textContent = '';
        document.getElementById('dd-continent').textContent = '';
        document.getElementById('dd-quick-stats').innerHTML = '';
        document.getElementById('deepdive-insights').innerHTML = '<p class="empty-hint">Choose a country to see its profile.</p>';
        document.getElementById('deepdive-metrics').innerHTML = '';
        document.getElementById('deepdive-note-card').style.display = 'none';
        destroyChart('deepdive-radar');
        return;
    }

    // Profile header
    document.getElementById('dd-flag').textContent = c.flag;
    document.getElementById('dd-name').textContent = c.name;
    const contSpan = document.getElementById('dd-continent');
    contSpan.textContent = c.continent;
    contSpan.style.color = CONTINENTS[c.continent] ? CONTINENTS[c.continent].color : 'inherit';

    // Quick stats
    document.getElementById('dd-quick-stats').innerHTML = `
        <div class="quick-stat"><span class="quick-label">Population</span><span class="quick-value">${c.population.toFixed(1)}M</span></div>
        <div class="quick-stat"><span class="quick-label">GDP</span><span class="quick-value">$${c.gdp.toLocaleString()}B</span></div>
        <div class="quick-stat"><span class="quick-label">HDI</span><span class="quick-value">${c.hdi.toFixed(3)}</span></div>
        <div class="quick-stat"><span class="quick-label">Median Age</span><span class="quick-value">${c.medianAge}y</span></div>
    `;

    // Radar chart
    createRadarChart('deepdive-radar', [c]);

    // Strengths & Weaknesses
    computeInsights(c);

    // Metric cards grid
    renderMetricCards(c);

    // Demo note
    if (c.demoNote) {
        document.getElementById('deepdive-note-card').style.display = 'block';
        document.getElementById('dd-demo-note').textContent = c.demoNote;
    } else {
        document.getElementById('deepdive-note-card').style.display = 'none';
    }

    // Historical Trends
    const histSelect = document.getElementById('historical-metric');
    const histMetric = histSelect ? histSelect.value : 'gdp';
    if (c.historicalData && c.historicalData.length > 0) {
        createLineChart('deepdive-history', c.historicalData, histMetric);
    } else {
        destroyChart('deepdive-history');
    }

    // Similar Countries
    renderSimilarCountries(c);
}

function renderSimilarCountries(target) {
    const container = document.getElementById('similarity-results');
    if (!container) return;
    container.innerHTML = '';

    const metrics = ['gdpPerCapita', 'hdi', 'lifeExpectancy', 'safetyIndex', 'democracyIndex', 'corruptionIndex', 'medianAge', 'urbanPopulation'];
    
    // Compute range for normalization
    const minMax = {};
    metrics.forEach(m => {
        const vals = COUNTRIES.map(c => c[m]).filter(v => v != null && !isNaN(v));
        minMax[m] = { min: Math.min(...vals), max: Math.max(...vals) };
    });

    const distances = [];
    COUNTRIES.forEach(c => {
        if (c.name === target.name) return;
        let sumSq = 0;
        let count = 0;
        metrics.forEach(m => {
            const v1 = target[m];
            const v2 = c[m];
            const mm = minMax[m];
            if (v1 != null && v2 != null && mm.max > mm.min) {
                const norm1 = (v1 - mm.min) / (mm.max - mm.min);
                const norm2 = (v2 - mm.min) / (mm.max - mm.min);
                sumSq += (norm1 - norm2) * (norm1 - norm2);
                count++;
            }
        });
        if (count > 0) {
            const dist = Math.sqrt(sumSq / count);
            const simScore = Math.max(50, Math.min(99, Math.round((1 - dist) * 100)));
            distances.push({ country: c, distance: dist, score: simScore });
        }
    });

    distances.sort((a, b) => a.distance - b.distance);
    const topSimilar = distances.slice(0, 4);

    topSimilar.forEach(item => {
        const sc = item.country;
        const card = document.createElement('div');
        card.className = 'similarity-card card';
        card.style.cursor = 'pointer';
        card.style.padding = '16px';
        card.style.transition = 'all 0.2s ease';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:1.1rem; font-weight:600;">${sc.flag} ${sc.name}</span>
                <span style="background:rgba(88,166,255,0.15); color:var(--accent-blue); padding:4px 10px; border-radius:12px; font-weight:600; font-size:0.85rem; border:1px solid rgba(88,166,255,0.3);">${item.score}% Match</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary); display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div><strong>GDP/cap:</strong> $${(sc.gdpPerCapita || 0).toLocaleString()}</div>
                <div><strong>HDI:</strong> ${(sc.hdi || 0).toFixed(3)}</div>
                <div><strong>Life Exp:</strong> ${sc.lifeExpectancy || '—'}y</div>
                <div><strong>Democracy:</strong> ${(sc.democracyIndex || 0).toFixed(2)}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            deepdiveCountry = sc;
            const ddSel = document.getElementById('deepdive-country');
            if (ddSel) ddSel.value = sc.name;
            renderDeepDive();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        container.appendChild(card);
    });
}

function computeInsights(country) {
    const container = document.getElementById('deepdive-insights');
    if (!container) return;

    // Compute global averages
    const averages = {};
    const comparisonMetrics = ['gdpPerCapita', 'hdi', 'lifeExpectancy', 'safetyIndex',
        'healthcareIndex', 'democracyIndex', 'corruptionIndex', 'pressFreedom',
        'unemployment', 'inflation', 'gini', 'costOfLiving', 'gdpGrowth',
        'passportStrength', 'tfr', 'internetUsers'];

    comparisonMetrics.forEach(key => {
        const vals = COUNTRIES.map(c => c[key]).filter(v => v != null && !isNaN(v));
        averages[key] = vals.reduce((s, v) => s + v, 0) / vals.length;
    });

    const strengths = [];
    const weaknesses = [];

    comparisonMetrics.forEach(key => {
        const meta = METRICS[key];
        if (!meta) return;
        const val = country[key];
        if (val == null || isNaN(val)) return;
        const avg = averages[key];
        const diff = val - avg;
        const pctDiff = avg !== 0 ? Math.abs(diff / avg) * 100 : 0;

        if (pctDiff < 10) return; // Not significant enough

        const fmtVal = typeof formatMetricValue === 'function'
            ? formatMetricValue(val, key) : val.toFixed(2);

        // Compute rank
        const sorted = COUNTRIES.map(c => c[key]).filter(v => v != null && !isNaN(v))
            .sort((a, b) => meta.higherIsBetter ? b - a : a - b);
        const rank = sorted.indexOf(val) + 1;

        const item = {
            label: meta.label,
            value: fmtVal,
            rank: rank,
            total: sorted.length,
            pctDiff: pctDiff
        };

        if (meta.higherIsBetter) {
            if (diff > 0) strengths.push(item);
            else weaknesses.push(item);
        } else {
            if (diff < 0) strengths.push(item);
            else weaknesses.push(item);
        }
    });

    // Sort by significance
    strengths.sort((a, b) => b.pctDiff - a.pctDiff);
    weaknesses.sort((a, b) => b.pctDiff - a.pctDiff);

    let html = '<div class="insights-section">';
    html += '<h4 class="insights-title text-positive">💪 Strengths</h4>';
    if (strengths.length === 0) {
        html += '<p class="empty-hint">No notable strengths vs. global average.</p>';
    } else {
        strengths.slice(0, 5).forEach(s => {
            html += `<div class="strength-item">
                <span class="insight-label">${s.label}</span>
                <span class="insight-value">${s.value}</span>
                <span class="insight-rank">#${s.rank} of ${s.total}</span>
            </div>`;
        });
    }
    html += '</div>';

    html += '<div class="insights-section" style="margin-top:var(--space-lg);">';
    html += '<h4 class="insights-title text-negative">⚠️ Watch Areas</h4>';
    if (weaknesses.length === 0) {
        html += '<p class="empty-hint">No notable weaknesses vs. global average.</p>';
    } else {
        weaknesses.slice(0, 5).forEach(w => {
            html += `<div class="weakness-item">
                <span class="insight-label">${w.label}</span>
                <span class="insight-value">${w.value}</span>
                <span class="insight-rank">#${w.rank} of ${w.total}</span>
            </div>`;
        });
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderMetricCards(country) {
    const container = document.getElementById('deepdive-metrics');
    if (!container) return;

    const categories = ['Economic', 'Wealth', 'Social', 'Demographics', 'Governance', 'Migration'];
    let html = '';

    categories.forEach(cat => {
        const metricsInCat = Object.entries(METRICS).filter(([k, m]) => m.category === cat);
        if (metricsInCat.length === 0) return;

        html += `<div class="card metric-section">
            <div class="card-header"><h3 class="chart-title">${getCategoryEmoji(cat)} ${cat}</h3></div>
            <div class="card-body">`;

        metricsInCat.forEach(([key, meta]) => {
            const val = country[key];
            const fmtVal = (val != null && !isNaN(val))
                ? (typeof formatMetricValue === 'function' ? formatMetricValue(val, key) : val.toLocaleString())
                : '—';

            // Compute percentile for bar width
            let barWidth = 0;
            if (val != null && !isNaN(val)) {
                const allVals = COUNTRIES.map(c => c[key]).filter(v => v != null && !isNaN(v));
                const min = Math.min(...allVals);
                const max = Math.max(...allVals);
                if (max > min) {
                    barWidth = ((val - min) / (max - min)) * 100;
                    if (!meta.higherIsBetter) barWidth = 100 - barWidth;
                }
            }

            const barColor = barWidth > 66 ? 'var(--accent-green)' :
                barWidth > 33 ? 'var(--accent-yellow)' : 'var(--accent-red)';

            html += `<div class="metric-item">
                <span class="metric-label">${meta.label}</span>
                <span class="metric-value">${fmtVal}</span>
                <div class="metric-bar-track"><div class="metric-bar" style="width:${barWidth}%; background:${barColor};"></div></div>
            </div>`;
        });

        html += '</div></div>';
    });

    container.innerHTML = html;
}

function getCategoryEmoji(cat) {
    const map = {
        'Economic': '💰', 'Wealth': '🏦', 'Social': '🏥',
        'Demographics': '👥', 'Governance': '🏛️', 'Migration': '✈️'
    };
    return map[cat] || '📊';
}

function initDeepDive() {
    // Populate country selector
    const sel = document.getElementById('deepdive-country');
    sel.innerHTML = '<option value="">— Choose a country —</option>';
    const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.flag} ${c.name}`;
        sel.appendChild(opt);
    });

    sel.addEventListener('change', (e) => {
        deepdiveCountry = COUNTRIES.find(c => c.name === e.target.value) || null;
        renderDeepDive();
    });

    
    const histSelect = document.getElementById('historical-metric');
    if (histSelect) {
        histSelect.addEventListener('change', () => renderDeepDive());
    }

    renderDeepDive();
}


// ═══════════════════════════════════════════════════════════════
// TAB 4: COMPARE COUNTRIES
// ═══════════════════════════════════════════════════════════════

function renderCompare() {
    const content = document.getElementById('compare-content');
    const empty = document.getElementById('compare-empty');
    const tags = document.getElementById('compare-tags');

    // Render tags
    tags.innerHTML = '';
    compareCountries.forEach((c, i) => {
        const tag = document.createElement('span');
        tag.className = 'country-tag';
        tag.innerHTML = `${c.flag} ${c.name} <button class="tag-remove" data-index="${i}">✕</button>`;
        tags.appendChild(tag);
    });

    // Remove tag handlers
    tags.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            compareCountries.splice(idx, 1);
            renderCompare();
        });
    });

    // Update add-country select (exclude already selected)
    const addSel = document.getElementById('compare-add-country');
    const currentVal = addSel.value;
    addSel.innerHTML = '<option value="">+ Add a country...</option>';
    const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(c => {
        if (compareCountries.find(cc => cc.name === c.name)) return;
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.flag} ${c.name}`;
        addSel.appendChild(opt);
    });

    if (compareCountries.length < 2) {
        content.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    content.style.display = 'block';
    empty.style.display = 'none';

    // Radar chart
    createRadarChart('compare-radar', compareCountries);

    // Radar legend
    const legendEl = document.getElementById('compare-radar-legend');
    const radarColors = ['#58a6ff', '#3fb950', '#f85149', '#bc8cff'];
    legendEl.innerHTML = compareCountries.map((c, i) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${radarColors[i % radarColors.length]}"></span>${c.flag} ${c.name}</span>`
    ).join('');

    // Comparison table
    const allMetricKeys = Object.keys(METRICS).filter(k =>
        !['cpr', 'demoNote'].includes(k)
    );
    const verdicts = createComparisonTable('compare-table-container', compareCountries, allMetricKeys);

    // Verdict cards
    renderVerdicts(verdicts);
}

function renderVerdicts(verdicts) {
    const container = document.getElementById('compare-verdicts');
    if (!container || !verdicts) {
        if (container) container.innerHTML = '';
        return;
    }

    const categoryLabels = {
        'Economic': '💰 Best Economy',
        'Wealth': '🏦 Most Wealth',
        'Social': '🏥 Best Quality of Life',
        'Demographics': '👥 Best Demographics',
        'Governance': '🏛️ Best Governance',
        'Migration': '✈️ Best for Migration'
    };

    let html = '';
    Object.entries(categoryLabels).forEach(([cat, label]) => {
        // Count wins per country in this category
        const wins = {};
        Object.entries(verdicts).forEach(([metricKey, winnerName]) => {
            const meta = METRICS[metricKey];
            if (meta && meta.category === cat) {
                wins[winnerName] = (wins[winnerName] || 0) + 1;
            }
        });

        if (Object.keys(wins).length === 0) return;

        // Find winner
        const winner = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
        const country = COUNTRIES.find(c => c.name === winner[0]);
        if (!country) return;

        html += `<div class="verdict-card">
            <div class="verdict-label">${label}</div>
            <div class="verdict-winner">${country.flag} ${country.name}</div>
        </div>`;
    });

    container.innerHTML = html;
}

function initCompare() {
    const addSel = document.getElementById('compare-add-country');
    addSel.addEventListener('change', (e) => {
        if (!e.target.value) return;
        if (compareCountries.length >= MAX_COMPARE) return;
        const country = COUNTRIES.find(c => c.name === e.target.value);
        if (country && !compareCountries.find(c => c.name === country.name)) {
            compareCountries.push(country);
            e.target.value = '';
            renderCompare();
        }
    });

    renderCompare();
}


// ═══════════════════════════════════════════════════════════════
// TAB 5: EXPLORE CORRELATIONS
// ═══════════════════════════════════════════════════════════════

function renderCorrelations() {
    const data = COUNTRIES.filter(c =>
        c[scatterX] != null && !isNaN(c[scatterX]) &&
        c[scatterY] != null && !isNaN(c[scatterY])
    );

    const result = createScatterPlot('scatter-plot', data, scatterX, scatterY, {
        sizeMetric: scatterSize,
        showTrendLine: scatterTrendline,
        showLabels: true
    });

    // Correlation badge
    const badge = document.getElementById('correlation-badge');
    const desc = document.getElementById('correlation-desc');
    const insightCard = document.getElementById('scatter-insight-card');
    const insightEl = document.getElementById('scatter-insight');

    if (result && result.correlation != null) {
        const r = result.correlation;
        const absR = Math.abs(r);
        badge.textContent = `r = ${r.toFixed(3)}`;

        // Color by strength
        if (absR >= 0.7) {
            badge.style.background = 'rgba(63, 185, 80, 0.15)';
            badge.style.color = 'var(--accent-green)';
            badge.style.borderColor = 'rgba(63, 185, 80, 0.3)';
        } else if (absR >= 0.4) {
            badge.style.background = 'rgba(210, 153, 34, 0.15)';
            badge.style.color = 'var(--accent-yellow)';
            badge.style.borderColor = 'rgba(210, 153, 34, 0.3)';
        } else {
            badge.style.background = 'rgba(125, 133, 144, 0.15)';
            badge.style.color = 'var(--text-secondary)';
            badge.style.borderColor = 'rgba(125, 133, 144, 0.3)';
        }

        // Description
        const xLabel = METRICS[scatterX] ? METRICS[scatterX].label : scatterX;
        const yLabel = METRICS[scatterY] ? METRICS[scatterY].label : scatterY;
        let strength = absR >= 0.7 ? 'Strong' : absR >= 0.4 ? 'Moderate' : 'Weak';
        let direction = r > 0 ? 'positive' : 'negative';
        desc.textContent = `${strength} ${direction} correlation between ${xLabel} and ${yLabel}`;

        // Insight
        if (absR >= 0.4) {
            insightCard.style.display = 'block';
            if (r > 0) {
                insightEl.textContent = `💡 Countries with higher ${xLabel} tend to also have higher ${yLabel}. ` +
                    `This ${strength.toLowerCase()} relationship (r=${r.toFixed(2)}) suggests these metrics move together across nations.`;
            } else {
                insightEl.textContent = `💡 Countries with higher ${xLabel} tend to have lower ${yLabel}. ` +
                    `This ${strength.toLowerCase()} inverse relationship (r=${r.toFixed(2)}) reveals an interesting tension between these dimensions.`;
            }
        } else {
            insightCard.style.display = 'none';
        }
    } else {
        badge.textContent = 'r = —';
        desc.textContent = '';
        insightCard.style.display = 'none';
    }
}

function initCorrelations() {
    // Build selectors
    const numericMetrics = Object.entries(METRICS)
        .filter(([k, m]) => !['cpr'].includes(k))
        .map(([k]) => k);

    buildMetricOptions('scatter-x', scatterX, []);
    buildMetricOptions('scatter-y', scatterY, []);
    buildMetricOptions('scatter-size', scatterSize, []);

    document.getElementById('scatter-x').addEventListener('change', (e) => {
        scatterX = e.target.value;
        renderCorrelations();
    });
    document.getElementById('scatter-y').addEventListener('change', (e) => {
        scatterY = e.target.value;
        renderCorrelations();
    });
    document.getElementById('scatter-size').addEventListener('change', (e) => {
        scatterSize = e.target.value;
        renderCorrelations();
    });
    document.getElementById('scatter-trendline').addEventListener('change', (e) => {
        scatterTrendline = e.target.checked;
        renderCorrelations();
    });

    renderCorrelations();
}


// ═══════════════════════════════════════════════════════════════
// TAB 6: MAP VIEW
// ═══════════════════════════════════════════════════════════════
let mapMetric = 'gdp';

function initMap() {
    buildMetricOptions('map-metric', mapMetric);
    const metricSelect = document.getElementById('map-metric');
    if (metricSelect) {
        metricSelect.addEventListener('change', (e) => {
            mapMetric = e.target.value;
            renderMap();
        });
    }
    renderMap();
}

function renderMap() {
    const data = COUNTRIES;
    const meta = METRICS[mapMetric] || {};
    document.getElementById('map-title').textContent = `Global Map: ${meta.label}`;
    createMapChart('map-container', data, mapMetric);
}

// ─── Export CSV Helper ─────────────────────────────────────────
function exportToCSV(data, filename) {
    if (!data || !data.length) return;
    
    // Get all keys from first object
    const keys = Object.keys(data[0]).filter(k => k !== 'historicalData');
    
    let csv = keys.join(',') + '\n';
    
    data.forEach(row => {
        let line = keys.map(key => {
            let val = row[key];
            if (val === null || val === undefined) val = '';
            // Escape quotes
            val = String(val).replace(/"/g, '""');
            // Enclose in quotes if contains comma
            if (val.search(/("|,|\n)/g) >= 0) {
                val = `"${val}"`;
            }
            return val;
        }).join(',');
        csv += line + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
