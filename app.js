// ═══════════════════════════════════════════════════════════════
// app.js — Application controller for Global Country Insights
// ═══════════════════════════════════════════════════════════════

// ─── Tab Management ────────────────────────────────────────────

let activeTab = 'overview';
const tabInitialized = {};

/**
 * Switch to a tab by name. Initializes the tab view on first visit.
 */
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });

    activeTab = tabName;

    // Initialize or re-render the tab
    if (!tabInitialized[tabName]) {
        tabInitialized[tabName] = true;
        switch (tabName) {
            case 'overview': initOverview(); break;
            case 'rankings': initRankings(); break;
            case 'deepdive': initDeepDive(); break;
            case 'compare': initCompare(); break;
            case 'correlations': initCorrelations(); break;
            case 'map': initMap(); break;
        }
    } else {
        // Re-render on revisit to catch state changes
        switch (tabName) {
            case 'overview': renderOverview(); break;
            case 'rankings': renderRankings(); break;
            case 'deepdive': renderDeepDive(); break;
            case 'compare': renderCompare(); break;
            case 'correlations': renderCorrelations(); break;
            case 'map': renderMap(); break;
        }
    }
}

// ─── Window resize handler ─────────────────────────────────────

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Re-render active tab's charts
        switch (activeTab) {
            case 'overview': renderOverview(); break;
            case 'deepdive': renderDeepDive(); break;
            case 'compare': renderCompare(); break;
            case 'correlations': renderCorrelations(); break;
            case 'map': renderMap(); break;
        }
    }, 300);
});

// ─── Data Helpers ──────────────────────────────────────────────

function normalizeValue(value, metricKey) {
  const metric = window.METRICS[metricKey];
  if (!metric) return 0;
  
  let min = Infinity;
  let max = -Infinity;
  
  for (const country of window.COUNTRIES) {
    const val = country[metricKey];
    if (val !== undefined && val !== null) {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  
  if (max === min) return 0;
  
  const normalized = (value - min) / (max - min);
  return metric.higherIsBetter ? normalized : (1 - normalized);
}

function getCountryScore(country, metricKey) {
  const normalized = normalizeValue(country[metricKey], metricKey);
  return Math.round(normalized * 100);
}

// ─── Initialize ────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [metricsRes, countriesRes] = await Promise.all([
            fetch('data/metrics.json'),
            fetch('data/countries.json')
        ]);
        
        window.METRICS = await metricsRes.json();
        const countriesData = await countriesRes.json();
        window.CONTINENTS = countriesData.CONTINENTS;
        window.COUNTRIES = countriesData.COUNTRIES;
    } catch (error) {
        console.error("Failed to load data:", error);
        alert("Failed to load dashboard data. Please ensure you are running via a local web server (e.g. Live Server).");
        return;
    }

    // Tab click handlers
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Initialize the default tab
    switchTab('overview');

    // Animate KPI cards on load
    document.querySelectorAll('.kpi-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.08}s`;
        card.classList.add('animate-in');
    });

    // Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    const updateThemeUI = (theme) => {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            if (themeBtn) themeBtn.textContent = '☀️ Light Mode';
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeBtn) themeBtn.textContent = '🌙 Dark Mode';
        }
    };

    const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
    updateThemeUI(savedTheme);

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            updateThemeUI(newTheme);
            localStorage.setItem('dashboard-theme', newTheme);
            
            // Re-render active tab charts for color updates
            setTimeout(() => {
                switch (activeTab) {
                    case 'overview': renderOverview(); break;
                    case 'deepdive': renderDeepDive(); break;
                    case 'compare': renderCompare(); break;
                    case 'correlations': renderCorrelations(); break;
                    case 'map': renderMap(); break;
                }
            }, 100);
        });
    }
});
