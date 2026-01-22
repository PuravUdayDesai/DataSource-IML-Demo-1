/**
 * DataScope - Dataset Visualizer
 * Clean, minimalist browser-style interface with file upload support
 */

// ============================================
// Global State
// ============================================

const state = {
    tabs: [],
    activeTabId: null,
    nextTabId: 1
};

function createTabData() {
    return {
        data: [],
        headers: [],
        columnTypes: {},
        currentPage: 1,
        rowsPerPage: 100,
        selectedColumns: [],
        selectedChartType: null,
        currentUrl: '',
        title: 'New Tab',
        fileName: ''
    };
}

// ============================================
// DOM Elements
// ============================================

const elements = {
    tabBar: document.getElementById('tabBar'),
    addTabBtn: document.getElementById('addTabBtn'),
    initialScreen: document.getElementById('initialScreen'),
    urlInputCenter: document.getElementById('urlInputCenter'),
    loadBtnCenter: document.getElementById('loadBtnCenter'),
    fileInputCenter: document.getElementById('fileInputCenter'),
    uploadBox: document.getElementById('uploadBox'),
    navBar: document.getElementById('navBar'),
    urlInputTop: document.getElementById('urlInputTop'),
    loadBtnTop: document.getElementById('loadBtnTop'),
    refreshBtn: document.getElementById('refreshBtn'),
    fileInput: document.getElementById('fileInput'),
    datasetView: document.getElementById('datasetView'),
    datasetTitle: document.getElementById('datasetTitle'),
    rowCount: document.getElementById('rowCount'),
    colCount: document.getElementById('colCount'),
    sizeInfo: document.getElementById('sizeInfo'),
    tableHead: document.getElementById('tableHead'),
    tableBody: document.getElementById('tableBody'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    columnsList: document.getElementById('columnsList'),
    generateChartBtn: document.getElementById('generateChartBtn'),
    chartOutput: document.getElementById('chartOutput'),
    chartInsights: document.getElementById('chartInsights'),
    validateBtn: document.getElementById('validateBtn'),
    validationResults: document.getElementById('validationResults'),
    scoreValue: document.getElementById('scoreValue'),
    scoreGrade: document.getElementById('scoreGrade'),
    visualizePanel: document.getElementById('visualizePanel'),
    validatePanel: document.getElementById('validatePanel'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loaderText: document.getElementById('loaderText'),
    chartModal: document.getElementById('chartModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalChartContainer: document.getElementById('modalChartContainer'),
    modalInsights: document.getElementById('modalInsights'),
    modalClose: document.getElementById('modalClose')
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    createInitialTab();
    initEventListeners();
    initDragDrop();
});

function createInitialTab() {
    addNewTab();
}

function initEventListeners() {
    // URL input handlers
    elements.loadBtnCenter.addEventListener('click', () => loadDataset(elements.urlInputCenter.value));
    elements.loadBtnTop.addEventListener('click', () => loadDataset(elements.urlInputTop.value));
    
    elements.urlInputCenter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadDataset(elements.urlInputCenter.value);
    });
    
    elements.urlInputTop.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadDataset(elements.urlInputTop.value);
    });
    
    // File upload handlers
    elements.fileInputCenter.addEventListener('change', handleFileUpload);
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.uploadBox.addEventListener('click', () => elements.fileInputCenter.click());
    
    // Sample dataset buttons
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            elements.urlInputCenter.value = url;
            loadDataset(url);
        });
    });
    
    // Add tab button
    elements.addTabBtn.addEventListener('click', () => {
        addNewTab();
        showInitialScreen();
    });
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab && tab.currentUrl) loadDataset(tab.currentUrl);
    });
    
    // Pagination
    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));
    
    // Panel tabs
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => switchPanel(tab.dataset.panel));
    });
    
    // Chart type buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', () => selectChartType(btn.dataset.chart));
    });
    
    // Generate chart
    elements.generateChartBtn.addEventListener('click', generateChart);
    
    // Validation
    elements.validateBtn.addEventListener('click', runValidation);
    
    // Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.chartModal.addEventListener('click', (e) => {
        if (e.target === elements.chartModal) closeModal();
    });
    
    // Download
    document.getElementById('downloadBtn').addEventListener('click', downloadData);
}

function initDragDrop() {
    const uploadBox = elements.uploadBox;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadBox.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadBox.addEventListener(eventName, () => uploadBox.classList.add('drag-over'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadBox.addEventListener(eventName, () => uploadBox.classList.remove('drag-over'), false);
    });
    
    uploadBox.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    const validExtensions = ['.csv', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
        showNotification('Please upload a CSV or TXT file', 'error');
        return;
    }
    
    showLoading(true, 'Reading file...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        parseAndLoadData(content, file.name);
    };
    reader.onerror = () => {
        showLoading(false);
        showNotification('Error reading file', 'error');
    };
    reader.readAsText(file);
}

function parseAndLoadData(csvText, fileName = 'Dataset') {
    showLoading(true, 'Parsing data...');
    
    Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
            if (results.data.length === 0) {
                showLoading(false);
                showNotification('No data found in the file', 'error');
                return;
            }
            
            const tab = getActiveTab();
            tab.data = results.data;
            tab.headers = results.meta.fields || Object.keys(results.data[0] || {});
            tab.currentPage = 1;
            tab.selectedColumns = [];
            tab.selectedChartType = null;
            tab.fileName = fileName;
            tab.title = fileName.replace(/\.(csv|txt)$/i, '').slice(0, 20);
            
            analyzeColumnTypes(tab);
            renderTabs();
            showDatasetView(tab);
            
            showLoading(false);
            showNotification(`Loaded ${tab.data.length.toLocaleString()} rows from ${fileName}`, 'success');
        },
        error: (error) => {
            showLoading(false);
            showNotification('Failed to parse file: ' + error.message, 'error');
        }
    });
}

// ============================================
// Tab Management
// ============================================

function addNewTab() {
    const tabId = state.nextTabId++;
    const tabData = createTabData();
    tabData.id = tabId;
    state.tabs.push(tabData);
    
    renderTabs();
    switchToTab(tabId);
    
    return tabId;
}

function renderTabs() {
    elements.tabBar.innerHTML = '';
    
    state.tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.id === state.activeTabId ? 'active' : ''}`;
        tabEl.dataset.tabId = tab.id;
        
        tabEl.innerHTML = `
            <span class="tab-icon">📊</span>
            <span class="tab-title">${tab.title}</span>
            ${state.tabs.length > 1 ? '<span class="tab-close" data-action="close">×</span>' : ''}
        `;
        
        tabEl.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close') {
                closeTab(tab.id);
            } else {
                switchToTab(tab.id);
            }
        });
        
        elements.tabBar.appendChild(tabEl);
    });
}

function switchToTab(tabId) {
    state.activeTabId = tabId;
    renderTabs();
    
    const tab = getActiveTab();
    if (tab && tab.data.length > 0) {
        showDatasetView(tab);
    } else {
        showInitialScreen();
    }
}

function closeTab(tabId) {
    const index = state.tabs.findIndex(t => t.id === tabId);
    if (index === -1 || state.tabs.length <= 1) return;
    
    state.tabs.splice(index, 1);
    
    if (state.activeTabId === tabId) {
        const newActiveIndex = Math.min(index, state.tabs.length - 1);
        state.activeTabId = state.tabs[newActiveIndex].id;
    }
    
    renderTabs();
    switchToTab(state.activeTabId);
}

function getActiveTab() {
    return state.tabs.find(t => t.id === state.activeTabId);
}

function updateActiveTab(updates) {
    const tab = getActiveTab();
    if (tab) Object.assign(tab, updates);
}

// ============================================
// Data Loading from URL
// ============================================

async function loadDataset(url) {
    if (!url.trim()) {
        showNotification('Please enter a URL', 'warning');
        return;
    }
    
    url = url.trim();
    updateActiveTab({ currentUrl: url });
    
    showLoading(true, 'Connecting...');
    
    try {
        const csvUrl = await processUrl(url);
        if (!csvUrl) {
            showLoading(false);
            return;
        }
        
        showLoading(true, 'Downloading dataset...');
        
        const response = await fetchWithProxy(csvUrl);
        const csvText = await response.text();
        
        const fileName = extractTitleFromUrl(url) + '.csv';
        parseAndLoadData(csvText, fileName);
        
    } catch (error) {
        showLoading(false);
        showNotification('Error: ' + error.message, 'error');
        console.error('Load error:', error);
    }
}

async function processUrl(url) {
    if (url.includes('kaggle.com/datasets/')) {
        return await processKaggleUrl(url);
    }
    return url;
}

async function processKaggleUrl(url) {
    showLoading(true, 'Fetching Kaggle dataset...');
    
    const match = url.match(/kaggle\.com\/datasets\/([^\/]+)\/([^\/\?\#]+)/);
    if (!match) {
        showNotification('Invalid Kaggle URL format', 'error');
        return null;
    }
    
    const [, username, datasetName] = match;
    
    try {
        const pageUrl = `https://www.kaggle.com/datasets/${username}/${datasetName}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`;
        
        const response = await fetch(proxyUrl);
        const html = await response.text();
        
        const csvPattern = /\"fileName\":\"([^\"]+\.csv)\"/gi;
        const matches = [...html.matchAll(csvPattern)];
        
        if (matches.length > 0) {
            showNotification(`Found: ${matches[0][1]}. Kaggle requires login for download.`, 'warning');
        }
        
        showNotification('Loading sample dataset instead...', 'info');
        return 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv';
        
    } catch (error) {
        console.error('Kaggle error:', error);
        showNotification('Could not access Kaggle. Using sample data.', 'warning');
        return 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv';
    }
}

async function fetchWithProxy(url) {
    const proxies = [
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    ];
    
    for (const proxyFn of proxies) {
        try {
            const response = await fetch(proxyFn(url));
            if (response.ok) return response;
        } catch (e) { continue; }
    }
    
    return fetch(url);
}

function extractTitleFromUrl(url) {
    try {
        if (url.includes('kaggle.com')) {
            const match = url.match(/datasets\/[^\/]+\/([^\/\?\#]+)/);
            if (match) return match[1].replace(/-/g, ' ').slice(0, 20);
        }
        const urlObj = new URL(url);
        const filename = urlObj.pathname.split('/').pop();
        return filename.replace('.csv', '').replace(/-|_/g, ' ').slice(0, 20) || 'Dataset';
    } catch {
        return 'Dataset';
    }
}

function analyzeColumnTypes(tab) {
    tab.columnTypes = {};
    
    tab.headers.forEach(header => {
        const values = tab.data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
        
        if (values.length === 0) {
            tab.columnTypes[header] = 'empty';
            return;
        }
        
        const numericCount = values.filter(v => typeof v === 'number' || !isNaN(parseFloat(v))).length;
        if (numericCount / values.length > 0.9) {
            tab.columnTypes[header] = 'numeric';
            return;
        }
        
        const booleanValues = ['true', 'false', '1', '0', 'yes', 'no', 't', 'f'];
        const booleanCount = values.filter(v => booleanValues.includes(String(v).toLowerCase())).length;
        if (booleanCount / values.length > 0.9) {
            tab.columnTypes[header] = 'boolean';
            return;
        }
        
        const uniqueValues = new Set(values.map(v => String(v)));
        if (uniqueValues.size < Math.min(50, values.length * 0.1)) {
            tab.columnTypes[header] = 'categorical';
            return;
        }
        
        tab.columnTypes[header] = 'text';
    });
}

// ============================================
// UI Updates
// ============================================

function showInitialScreen() {
    elements.initialScreen.style.display = 'flex';
    elements.datasetView.classList.remove('visible');
    elements.navBar.classList.add('visible');
    elements.urlInputTop.value = '';
    elements.urlInputCenter.value = '';
}

function showDatasetView(tab) {
    elements.initialScreen.style.display = 'none';
    elements.datasetView.classList.add('visible');
    elements.navBar.classList.add('visible');
    
    elements.urlInputTop.value = tab.currentUrl || tab.fileName;
    elements.datasetTitle.textContent = tab.title;
    elements.rowCount.textContent = tab.data.length.toLocaleString();
    elements.colCount.textContent = tab.headers.length;
    
    const sizeBytes = JSON.stringify(tab.data).length;
    elements.sizeInfo.textContent = formatBytes(sizeBytes);
    
    renderTable(tab);
    renderColumnSelector(tab);
    resetValidation();
    hideChartInsights();
}

function showLoading(show, message = 'Loading...') {
    elements.loadingOverlay.classList.toggle('visible', show);
    elements.loaderText.textContent = message;
}

function switchPanel(panel) {
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.panel === panel);
    });
    
    elements.visualizePanel.classList.toggle('hidden', panel !== 'visualize');
    elements.validatePanel.classList.toggle('hidden', panel !== 'validate');
}

// ============================================
// Table Rendering
// ============================================

function renderTable(tab) {
    if (!tab) tab = getActiveTab();
    if (!tab) return;
    
    elements.tableHead.innerHTML = '';
    elements.tableBody.innerHTML = '';
    
    const headerRow = document.createElement('tr');
    tab.headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.title = `${header} (${tab.columnTypes[header]})`;
        headerRow.appendChild(th);
    });
    elements.tableHead.appendChild(headerRow);
    
    const totalPages = Math.ceil(tab.data.length / tab.rowsPerPage);
    const startIdx = (tab.currentPage - 1) * tab.rowsPerPage;
    const endIdx = Math.min(startIdx + tab.rowsPerPage, tab.data.length);
    const pageData = tab.data.slice(startIdx, endIdx);
    
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        tab.headers.forEach(header => {
            const td = document.createElement('td');
            const value = row[header];
            td.textContent = value !== null && value !== undefined ? value : '';
            td.title = String(value);
            tr.appendChild(td);
        });
        elements.tableBody.appendChild(tr);
    });
    
    elements.pageInfo.textContent = `Page ${tab.currentPage} of ${totalPages || 1}`;
    elements.prevPage.disabled = tab.currentPage === 1;
    elements.nextPage.disabled = tab.currentPage >= totalPages;
}

function changePage(delta) {
    const tab = getActiveTab();
    if (!tab) return;
    
    const totalPages = Math.ceil(tab.data.length / tab.rowsPerPage);
    const newPage = tab.currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        tab.currentPage = newPage;
        renderTable(tab);
    }
}

// ============================================
// Column Selector
// ============================================

function renderColumnSelector(tab) {
    if (!tab) tab = getActiveTab();
    if (!tab) return;
    
    elements.columnsList.innerHTML = '';
    tab.selectedColumns = [];
    
    tab.headers.forEach(header => {
        const type = tab.columnTypes[header];
        const item = document.createElement('div');
        item.className = 'column-item';
        item.dataset.column = header;
        
        item.innerHTML = `
            <input type="checkbox" id="col-${header}">
            <span class="column-checkbox"></span>
            <span class="column-name">${header}</span>
            <span class="column-type ${type}">${type}</span>
        `;
        
        item.addEventListener('click', () => {
            item.classList.toggle('selected');
            if (item.classList.contains('selected')) {
                if (!tab.selectedColumns.includes(header)) {
                    tab.selectedColumns.push(header);
                }
            } else {
                tab.selectedColumns = tab.selectedColumns.filter(c => c !== header);
            }
        });
        
        elements.columnsList.appendChild(item);
    });
}

function selectChartType(type) {
    const tab = getActiveTab();
    if (tab) tab.selectedChartType = type;
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.chart === type);
    });
}

// ============================================
// Chart Generation with Insights
// ============================================

function generateChart() {
    const tab = getActiveTab();
    if (!tab) return;
    
    if (tab.selectedColumns.length === 0) {
        showNotification('Select at least one column', 'warning');
        return;
    }
    
    if (!tab.selectedChartType) {
        showNotification('Select a chart type', 'warning');
        return;
    }
    
    const chartFunctions = {
        histogram: () => generateSmartHistogram(tab),
        scatter: () => generateScatter(tab),
        heatmap: () => generateHeatmap(tab),
        boxplot: () => generateBoxPlot(tab),
        pie: () => generatePieChart(tab),
        bar: () => generateSmartBarChart(tab)
    };
    
    chartFunctions[tab.selectedChartType]?.();
}

function getColumnStats(tab, column) {
    const values = tab.data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
    const type = tab.columnTypes[column];
    
    if (type === 'numeric') {
        const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            type: 'numeric',
            count: nums.length,
            min,
            max,
            mean,
            median,
            stdDev,
            sum
        };
    } else {
        // Categorical/text - get value counts
        const counts = {};
        values.forEach(v => {
            const key = String(v);
            counts[key] = (counts[key] || 0) + 1;
        });
        
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const uniqueCount = sorted.length;
        const mostCommon = sorted[0];
        const leastCommon = sorted[sorted.length - 1];
        
        return {
            type: 'categorical',
            totalCount: values.length,
            uniqueCount,
            valueCounts: counts,
            sortedCounts: sorted,
            mostCommon: { value: mostCommon[0], count: mostCommon[1] },
            leastCommon: { value: leastCommon[0], count: leastCommon[1] }
        };
    }
}

function generateSmartHistogram(tab) {
    const column = tab.selectedColumns[0];
    const stats = getColumnStats(tab, column);
    
    let traces, insights;
    
    if (stats.type === 'numeric') {
        // Numeric histogram
        const values = tab.data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
        
        traces = [{
            x: values,
            type: 'histogram',
            marker: { 
                color: '#007aff',
                line: { color: '#0056b3', width: 1 }
            },
            nbinsx: Math.min(30, Math.ceil(Math.sqrt(values.length)))
        }];
        
        insights = {
            'Total Values': stats.count.toLocaleString(),
            'Mean': stats.mean.toFixed(2),
            'Median': stats.median.toFixed(2),
            'Std Dev': stats.stdDev.toFixed(2),
            'Min': stats.min.toFixed(2),
            'Max': stats.max.toFixed(2)
        };
    } else {
        // Categorical - show distinct counts
        const sorted = stats.sortedCounts.slice(0, 20);
        
        traces = [{
            x: sorted.map(d => d[0]),
            y: sorted.map(d => d[1]),
            type: 'bar',
            marker: { 
                color: sorted.map((_, i) => `hsl(${210 + i * 15}, 70%, 55%)`),
                line: { color: '#fff', width: 1 }
            },
            text: sorted.map(d => d[1]),
            textposition: 'outside'
        }];
        
        insights = {
            'Total Values': stats.totalCount.toLocaleString(),
            'Distinct Values': stats.uniqueCount.toLocaleString(),
            'Most Common': `${stats.mostCommon.value} (${stats.mostCommon.count})`,
            'Least Common': `${stats.leastCommon.value} (${stats.leastCommon.count})`,
            'Coverage': `${((stats.mostCommon.count / stats.totalCount) * 100).toFixed(1)}% by top value`
        };
    }
    
    const layout = getChartLayout(
        stats.type === 'numeric' ? `Distribution of ${column}` : `Value Counts: ${column}`,
        column,
        stats.type === 'numeric' ? 'Frequency' : 'Count'
    );
    
    if (stats.type !== 'numeric') {
        layout.xaxis.tickangle = -45;
    }
    
    renderPlotlyChart(traces, layout, `Histogram: ${column}`, insights);
}

function generateSmartBarChart(tab) {
    const column = tab.selectedColumns[0];
    const stats = getColumnStats(tab, column);
    
    let traces, insights;
    
    if (stats.type === 'categorical' || stats.type === 'text' || stats.type === 'boolean') {
        const sorted = stats.sortedCounts.slice(0, 25);
        const colors = generateColorScale(sorted.length);
        
        traces = [{
            x: sorted.map(d => d[0]),
            y: sorted.map(d => d[1]),
            type: 'bar',
            marker: { 
                color: colors,
                line: { color: '#fff', width: 1 }
            },
            text: sorted.map(d => `${d[1]} (${((d[1] / stats.totalCount) * 100).toFixed(1)}%)`),
            textposition: 'outside',
            hovertemplate: '%{x}<br>Count: %{y}<br>Percentage: %{text}<extra></extra>'
        }];
        
        insights = {
            'Total Records': stats.totalCount.toLocaleString(),
            'Distinct Values': stats.uniqueCount.toLocaleString(),
            'Most Frequent': `${stats.mostCommon.value}`,
            'Most Freq Count': `${stats.mostCommon.count} (${((stats.mostCommon.count / stats.totalCount) * 100).toFixed(1)}%)`,
            'Least Frequent': `${stats.leastCommon.value}`,
            'Least Freq Count': `${stats.leastCommon.count} (${((stats.leastCommon.count / stats.totalCount) * 100).toFixed(1)}%)`
        };
    } else {
        // Numeric - bin it
        return generateSmartHistogram(tab);
    }
    
    const layout = getChartLayout(`${column} Distribution`, column, 'Count');
    layout.xaxis.tickangle = -45;
    layout.bargap = 0.15;
    
    renderPlotlyChart(traces, layout, `Bar Chart: ${column}`, insights);
}

function generatePieChart(tab) {
    const column = tab.selectedColumns[0];
    const stats = getColumnStats(tab, column);
    
    if (stats.type === 'numeric') {
        showNotification('Pie charts work best with categorical data', 'warning');
        return generateSmartHistogram(tab);
    }
    
    // Take top 10 for pie chart, group rest as "Other"
    let pieData = stats.sortedCounts.slice(0, 10);
    const otherCount = stats.sortedCounts.slice(10).reduce((a, b) => a + b[1], 0);
    
    if (otherCount > 0) {
        pieData.push(['Other', otherCount]);
    }
    
    const colors = generateColorScale(pieData.length);
    
    const traces = [{
        values: pieData.map(d => d[1]),
        labels: pieData.map(d => d[0]),
        type: 'pie',
        marker: { colors },
        textinfo: 'label+percent',
        textposition: 'outside',
        hovertemplate: '%{label}<br>Count: %{value}<br>Percentage: %{percent}<extra></extra>'
    }];
    
    const insights = {
        'Total Records': stats.totalCount.toLocaleString(),
        'Categories Shown': pieData.length,
        'Largest Segment': `${stats.mostCommon.value} (${((stats.mostCommon.count / stats.totalCount) * 100).toFixed(1)}%)`,
        'Smallest Segment': `${stats.leastCommon.value} (${((stats.leastCommon.count / stats.totalCount) * 100).toFixed(1)}%)`
    };
    
    const layout = {
        title: { text: `${column} Distribution`, font: { size: 14 } },
        showlegend: true,
        legend: { orientation: 'h', y: -0.1 },
        paper_bgcolor: 'rgba(255,255,255,0)',
        font: { family: '-apple-system, sans-serif' },
        margin: { t: 40, r: 20, b: 60, l: 20 }
    };
    
    renderPlotlyChart(traces, layout, `Pie Chart: ${column}`, insights);
}

function generateScatter(tab) {
    if (tab.selectedColumns.length < 2) {
        showNotification('Select at least 2 columns for scatter plot', 'warning');
        return;
    }
    
    const xCol = tab.selectedColumns[0];
    const yCol = tab.selectedColumns[1];
    
    const validData = tab.data
        .map(row => ({ x: parseFloat(row[xCol]), y: parseFloat(row[yCol]) }))
        .filter(d => !isNaN(d.x) && !isNaN(d.y));
    
    // Calculate correlation
    const correlation = calculateCorrelation(tab, xCol, yCol);
    
    const traces = [{
        x: validData.map(d => d.x),
        y: validData.map(d => d.y),
        mode: 'markers',
        type: 'scatter',
        marker: { 
            color: '#007aff', 
            size: 6, 
            opacity: 0.6,
            line: { color: '#fff', width: 0.5 }
        }
    }];
    
    const xStats = getColumnStats(tab, xCol);
    const yStats = getColumnStats(tab, yCol);
    
    const insights = {
        'Data Points': validData.length.toLocaleString(),
        'Correlation': correlation.toFixed(3),
        'Relationship': correlation > 0.7 ? 'Strong Positive' : correlation < -0.7 ? 'Strong Negative' : correlation > 0.3 ? 'Moderate Positive' : correlation < -0.3 ? 'Moderate Negative' : 'Weak',
        [`${xCol} Mean`]: xStats.mean?.toFixed(2) || 'N/A',
        [`${yCol} Mean`]: yStats.mean?.toFixed(2) || 'N/A'
    };
    
    const layout = getChartLayout(`${xCol} vs ${yCol}`, xCol, yCol);
    renderPlotlyChart(traces, layout, `Scatter: ${xCol} vs ${yCol}`, insights);
}

function generateHeatmap(tab) {
    const numericColumns = tab.selectedColumns.filter(c => tab.columnTypes[c] === 'numeric');
    
    if (numericColumns.length < 2) {
        showNotification('Select at least 2 numeric columns', 'warning');
        return;
    }
    
    const correlationMatrix = [];
    const annotations = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
        const row = [];
        for (let j = 0; j < numericColumns.length; j++) {
            const corr = calculateCorrelation(tab, numericColumns[i], numericColumns[j]);
            row.push(corr);
            
            annotations.push({
                x: numericColumns[j],
                y: numericColumns[i],
                text: corr.toFixed(2),
                showarrow: false,
                font: { color: Math.abs(corr) > 0.5 ? '#fff' : '#000', size: 11 }
            });
        }
        correlationMatrix.push(row);
    }
    
    const traces = [{
        z: correlationMatrix,
        x: numericColumns,
        y: numericColumns,
        type: 'heatmap',
        colorscale: [[0, '#ff3b30'], [0.5, '#f5f5f7'], [1, '#34c759']],
        zmin: -1,
        zmax: 1,
        showscale: true
    }];
    
    // Find strongest correlations
    let maxCorr = { val: 0, pair: '' };
    for (let i = 0; i < numericColumns.length; i++) {
        for (let j = i + 1; j < numericColumns.length; j++) {
            const corr = Math.abs(correlationMatrix[i][j]);
            if (corr > Math.abs(maxCorr.val)) {
                maxCorr = { val: correlationMatrix[i][j], pair: `${numericColumns[i]} & ${numericColumns[j]}` };
            }
        }
    }
    
    const insights = {
        'Variables': numericColumns.length,
        'Strongest Correlation': maxCorr.pair,
        'Correlation Value': maxCorr.val.toFixed(3),
        'Relationship': maxCorr.val > 0.7 ? 'Strong Positive' : maxCorr.val < -0.7 ? 'Strong Negative' : 'Moderate'
    };
    
    const layout = getChartLayout('Correlation Matrix');
    layout.xaxis.tickangle = -45;
    layout.annotations = annotations;
    
    renderPlotlyChart(traces, layout, 'Correlation Heatmap', insights);
}

function generateBoxPlot(tab) {
    const numericCols = tab.selectedColumns.filter(col => tab.columnTypes[col] === 'numeric');
    
    if (numericCols.length === 0) {
        showNotification('Select numeric columns for box plot', 'warning');
        return;
    }
    
    const colors = generateColorScale(numericCols.length);
    
    const traces = numericCols.map((col, idx) => ({
        y: tab.data.map(row => parseFloat(row[col])).filter(v => !isNaN(v)),
        type: 'box',
        name: col,
        marker: { color: colors[idx] },
        boxpoints: 'outliers'
    }));
    
    const insights = {};
    numericCols.forEach(col => {
        const stats = getColumnStats(tab, col);
        insights[`${col} Median`] = stats.median?.toFixed(2) || 'N/A';
    });
    insights['Variables'] = numericCols.length;
    
    const layout = getChartLayout('Box Plot Comparison', '', 'Values');
    renderPlotlyChart(traces, layout, 'Box Plot', insights);
}

function calculateCorrelation(tab, col1, col2) {
    const data = tab.data
        .map(row => ({ x: parseFloat(row[col1]), y: parseFloat(row[col2]) }))
        .filter(d => !isNaN(d.x) && !isNaN(d.y));
    
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((a, d) => a + d.x, 0);
    const sumY = data.reduce((a, d) => a + d.y, 0);
    const sumXY = data.reduce((a, d) => a + d.x * d.y, 0);
    const sumX2 = data.reduce((a, d) => a + d.x * d.x, 0);
    const sumY2 = data.reduce((a, d) => a + d.y * d.y, 0);
    
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return den === 0 ? 0 : num / den;
}

function generateColorScale(count) {
    const baseColors = [
        '#007aff', '#34c759', '#ff9500', '#ff3b30', '#5856d6',
        '#af52de', '#00c7be', '#ff2d55', '#64d2ff', '#ffd60a'
    ];
    
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // Generate more colors
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 360 / count) % 360;
        colors.push(`hsl(${hue}, 65%, 55%)`);
    }
    return colors;
}

function getChartLayout(title, xTitle = '', yTitle = '') {
    return {
        title: { text: title, font: { size: 14, color: '#1d1d1f' } },
        xaxis: { title: xTitle, gridcolor: '#e8e8ed', zeroline: false },
        yaxis: { title: yTitle, gridcolor: '#e8e8ed', zeroline: false },
        paper_bgcolor: 'rgba(255,255,255,0)',
        plot_bgcolor: 'rgba(255,255,255,0)',
        font: { color: '#1d1d1f', family: '-apple-system, BlinkMacSystemFont, sans-serif' },
        margin: { t: 40, r: 20, b: 60, l: 60 },
        hoverlabel: { bgcolor: '#fff', bordercolor: '#ddd', font: { color: '#1d1d1f' } }
    };
}

function renderPlotlyChart(traces, layout, title, insights = {}) {
    elements.chartOutput.innerHTML = '';
    
    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(elements.chartOutput, traces, layout, config);
    
    // Show insights panel
    showChartInsights(insights);
    
    // Modal
    elements.modalTitle.textContent = title;
    elements.modalChartContainer.innerHTML = '';
    elements.chartModal.classList.add('visible');
    Plotly.newPlot(elements.modalChartContainer, traces, { ...layout, height: 420 }, config);
    
    // Modal insights
    showModalInsights(insights);
}

function showChartInsights(insights) {
    if (Object.keys(insights).length === 0) {
        elements.chartInsights.classList.remove('visible');
        return;
    }
    
    let html = '<h4>Insights</h4>';
    Object.entries(insights).forEach(([label, value]) => {
        html += `<div class="insight-item">
            <span class="insight-label">${label}</span>
            <span class="insight-value">${value}</span>
        </div>`;
    });
    
    elements.chartInsights.innerHTML = html;
    elements.chartInsights.classList.add('visible');
}

function showModalInsights(insights) {
    if (Object.keys(insights).length === 0) {
        elements.modalInsights.classList.remove('visible');
        return;
    }
    
    let html = '<h4>Analysis Summary</h4><div class="insights-grid">';
    Object.entries(insights).forEach(([label, value]) => {
        html += `<div class="insight-card">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
        </div>`;
    });
    html += '</div>';
    
    elements.modalInsights.innerHTML = html;
    elements.modalInsights.classList.add('visible');
}

function hideChartInsights() {
    elements.chartInsights.classList.remove('visible');
    elements.chartInsights.innerHTML = '';
}

function closeModal() {
    elements.chartModal.classList.remove('visible');
}

// ============================================
// Validation
// ============================================

function resetValidation() {
    document.querySelectorAll('.validation-item').forEach(item => {
        item.className = 'validation-item';
        item.querySelector('.val-icon').textContent = '⏳';
        item.querySelector('.val-detail').textContent = 'Waiting...';
    });
    
    elements.scoreValue.textContent = '--';
    document.querySelector('.score-circle').className = 'score-circle';
    elements.scoreGrade.querySelector('.grade-text').className = 'grade-text';
    elements.scoreGrade.querySelector('.grade-text').textContent = 'Run validation';
    
    // Remove correlation details
    const corrDetails = document.getElementById('correlationDetails');
    if (corrDetails) corrDetails.remove();
}

function runValidation() {
    const tab = getActiveTab();
    if (!tab || tab.data.length === 0) {
        showNotification('Load a dataset first', 'warning');
        return;
    }
    
    const results = {
        rowCount: validateRowCount(tab),
        numericVars: validateNumericVariables(tab),
        missingData: validateMissingData(tab),
        independence: validateIndependence(tab)
    };
    
    updateValidationItem('valRowCount', results.rowCount);
    updateValidationItem('valNumericVars', results.numericVars);
    updateValidationItem('valMissingData', results.missingData);
    updateValidationItem('valIndependence', results.independence);
    
    // Show correlation details
    showCorrelationDetails(results.independence);
    
    const score = calculateScore(results);
    updateScore(score);
}

function validateRowCount(tab) {
    const count = tab.data.length;
    
    if (count >= 10000) {
        return { status: 'pass', icon: '✅', detail: `${count.toLocaleString()} rows - excellent for ML` };
    } else if (count >= 1000 && count < 10000) {
        return { status: 'warning', icon: '⚠️', detail: `${count.toLocaleString()} rows - more data recommended` };
    } else {
        return { status: 'fail', icon: '❌', detail: `${count.toLocaleString()} rows - insufficient (need 10,000+)` };
    }
}

function validateNumericVariables(tab) {
    const total = tab.headers.length;
    const numericCount = tab.headers.filter(h => tab.columnTypes[h] === 'numeric').length;
    
    if (total >= 10 && numericCount >= 7) {
        return { status: 'pass', icon: '✅', detail: `${numericCount} numeric of ${total} total` };
    } else if (total >= 8 && numericCount >= 5) {
        return { status: 'warning', icon: '⚠️', detail: `${numericCount} numeric of ${total} total` };
    } else {
        return { status: 'fail', icon: '❌', detail: `${numericCount} numeric of ${total} - need ≥7 of 10+` };
    }
}

function validateMissingData(tab) {
    const totalCells = tab.data.length * tab.headers.length;
    let missingCells = 0;
    
    tab.data.forEach(row => {
        tab.headers.forEach(header => {
            const val = row[header];
            if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
                missingCells++;
            }
        });
    });
    
    const missingPercent = (missingCells / totalCells) * 100;
    
    if (missingPercent < 5) {
        return { status: 'pass', icon: '✅', detail: `${missingPercent.toFixed(1)}% missing - excellent` };
    } else if (missingPercent < 10) {
        return { status: 'warning', icon: '⚠️', detail: `${missingPercent.toFixed(1)}% missing - acceptable` };
    } else {
        return { status: 'fail', icon: '❌', detail: `${missingPercent.toFixed(1)}% missing - exceeds 10%` };
    }
}

function validateIndependence(tab) {
    const numericCols = tab.headers.filter(h => tab.columnTypes[h] === 'numeric');
    
    if (numericCols.length < 2) {
        return { status: 'fail', icon: '❌', detail: 'Not enough numeric columns', correlations: null };
    }
    
    // Calculate all correlations and store them
    const correlationData = [];
    const dependentPairs = [];
    const independentPairs = [];
    
    for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
            const corr = calculateCorrelation(tab, numericCols[i], numericCols[j]);
            const absCorr = Math.abs(corr);
            
            correlationData.push({
                col1: numericCols[i],
                col2: numericCols[j],
                correlation: corr,
                absCorrelation: absCorr,
                relationship: absCorr > 0.7 ? 'dependent' : absCorr < 0.3 ? 'independent' : 'moderate'
            });
            
            if (absCorr > 0.7) {
                dependentPairs.push({ cols: [numericCols[i], numericCols[j]], corr });
            } else if (absCorr < 0.3) {
                independentPairs.push({ cols: [numericCols[i], numericCols[j]], corr });
            }
        }
    }
    
    // Store correlation data for display
    tab.correlationData = correlationData;
    tab.dependentPairs = dependentPairs;
    tab.independentPairs = independentPairs;
    
    const totalPairs = correlationData.length;
    const hasIndependent = independentPairs.length >= totalPairs * 0.3;
    const hasDependent = dependentPairs.length >= 1;
    
    let result;
    if (hasIndependent && hasDependent) {
        result = { 
            status: 'pass', 
            icon: '✅', 
            detail: `Good mix: ${independentPairs.length} independent, ${dependentPairs.length} dependent pairs`
        };
    } else if (hasIndependent && !hasDependent) {
        result = { 
            status: 'warning', 
            icon: '⚠️', 
            detail: `${independentPairs.length} independent pairs, but no strongly dependent pairs for supervised learning`
        };
    } else if (!hasIndependent && hasDependent) {
        result = { 
            status: 'warning', 
            icon: '⚠️', 
            detail: `High multicollinearity: ${dependentPairs.length} dependent pairs detected`
        };
    } else {
        result = { 
            status: 'warning', 
            icon: '⚠️', 
            detail: 'Moderate correlations across variables'
        };
    }
    
    result.correlations = correlationData;
    result.dependentPairs = dependentPairs;
    result.independentPairs = independentPairs;
    
    return result;
}

function updateValidationItem(elementId, result) {
    const element = document.getElementById(elementId);
    element.className = `validation-item ${result.status}`;
    element.querySelector('.val-icon').textContent = result.icon;
    element.querySelector('.val-detail').textContent = result.detail;
}

function showCorrelationDetails(independenceResult) {
    // Remove existing correlation details
    const existing = document.getElementById('correlationDetails');
    if (existing) existing.remove();
    
    if (!independenceResult.correlations || independenceResult.correlations.length === 0) {
        return;
    }
    
    const container = document.createElement('div');
    container.id = 'correlationDetails';
    container.className = 'correlation-details';
    
    let html = `
        <div class="corr-header">
            <h4>📊 Variable Independence Analysis</h4>
            <p class="corr-explanation">
                <strong>How it works:</strong> We calculate the Pearson correlation coefficient (r) between each pair of numeric variables.
                <br>• <span class="tag dependent">Dependent</span> |r| > 0.7 — Strong linear relationship, useful for prediction
                <br>• <span class="tag moderate">Moderate</span> 0.3 ≤ |r| ≤ 0.7 — Some relationship exists
                <br>• <span class="tag independent">Independent</span> |r| < 0.3 — Little to no linear relationship
            </p>
        </div>
    `;
    
    // Show dependent pairs (good for supervised learning)
    if (independenceResult.dependentPairs && independenceResult.dependentPairs.length > 0) {
        html += `
            <div class="corr-section">
                <h5>🔗 Dependent Variable Pairs <span class="badge success">${independenceResult.dependentPairs.length}</span></h5>
                <p class="section-desc">These pairs have strong correlations — good candidates for supervised learning (one can predict the other)</p>
                <div class="corr-pairs">
        `;
        
        independenceResult.dependentPairs.slice(0, 5).forEach(pair => {
            const corrPercent = Math.abs(pair.corr * 100).toFixed(0);
            const direction = pair.corr > 0 ? '↗ Positive' : '↘ Negative';
            html += `
                <div class="corr-pair dependent">
                    <div class="pair-cols">
                        <span class="col-name">${pair.cols[0]}</span>
                        <span class="corr-arrow">⟷</span>
                        <span class="col-name">${pair.cols[1]}</span>
                    </div>
                    <div class="pair-stats">
                        <span class="corr-value">${pair.corr.toFixed(3)}</span>
                        <span class="corr-bar">
                            <span class="bar-fill dependent" style="width: ${corrPercent}%"></span>
                        </span>
                        <span class="corr-direction">${direction}</span>
                    </div>
                </div>
            `;
        });
        
        if (independenceResult.dependentPairs.length > 5) {
            html += `<p class="more-pairs">+ ${independenceResult.dependentPairs.length - 5} more dependent pairs</p>`;
        }
        
        html += `</div></div>`;
    }
    
    // Show independent pairs
    if (independenceResult.independentPairs && independenceResult.independentPairs.length > 0) {
        html += `
            <div class="corr-section">
                <h5>🔓 Independent Variable Pairs <span class="badge info">${independenceResult.independentPairs.length}</span></h5>
                <p class="section-desc">These pairs have weak correlations — good for avoiding multicollinearity in models</p>
                <div class="corr-pairs">
        `;
        
        independenceResult.independentPairs.slice(0, 5).forEach(pair => {
            const corrPercent = Math.abs(pair.corr * 100).toFixed(0);
            html += `
                <div class="corr-pair independent">
                    <div class="pair-cols">
                        <span class="col-name">${pair.cols[0]}</span>
                        <span class="corr-arrow">⟷</span>
                        <span class="col-name">${pair.cols[1]}</span>
                    </div>
                    <div class="pair-stats">
                        <span class="corr-value">${pair.corr.toFixed(3)}</span>
                        <span class="corr-bar">
                            <span class="bar-fill independent" style="width: ${Math.max(corrPercent, 5)}%"></span>
                        </span>
                        <span class="corr-direction">Weak</span>
                    </div>
                </div>
            `;
        });
        
        if (independenceResult.independentPairs.length > 5) {
            html += `<p class="more-pairs">+ ${independenceResult.independentPairs.length - 5} more independent pairs</p>`;
        }
        
        html += `</div></div>`;
    }
    
    // Summary
    const totalPairs = independenceResult.correlations.length;
    const depCount = independenceResult.dependentPairs?.length || 0;
    const indCount = independenceResult.independentPairs?.length || 0;
    const modCount = totalPairs - depCount - indCount;
    
    html += `
        <div class="corr-summary">
            <h5>Summary</h5>
            <div class="summary-bars">
                <div class="summary-item">
                    <span class="label">Dependent</span>
                    <span class="bar"><span class="fill dependent" style="width: ${(depCount/totalPairs)*100}%"></span></span>
                    <span class="count">${depCount}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Moderate</span>
                    <span class="bar"><span class="fill moderate" style="width: ${(modCount/totalPairs)*100}%"></span></span>
                    <span class="count">${modCount}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Independent</span>
                    <span class="bar"><span class="fill independent" style="width: ${(indCount/totalPairs)*100}%"></span></span>
                    <span class="count">${indCount}</span>
                </div>
            </div>
            <p class="summary-text">Total: ${totalPairs} variable pairs analyzed</p>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Insert after validation results
    const validationResults = document.getElementById('validationResults');
    validationResults.parentNode.insertBefore(container, validationResults.nextSibling);
}

function calculateScore(results) {
    const weights = { rowCount: 25, numericVars: 30, missingData: 25, independence: 20 };
    let score = 0;
    
    Object.entries(results).forEach(([key, result]) => {
        const weight = weights[key];
        if (result.status === 'pass') score += weight;
        else if (result.status === 'warning') score += weight * 0.6;
    });
    
    return Math.round(score);
}

function updateScore(score) {
    const scoreCircle = document.querySelector('.score-circle');
    const gradeText = elements.scoreGrade.querySelector('.grade-text');
    
    elements.scoreValue.textContent = score;
    scoreCircle.className = 'score-circle';
    gradeText.className = 'grade-text';
    
    if (score >= 85) {
        scoreCircle.classList.add('excellent');
        gradeText.classList.add('excellent');
        gradeText.textContent = 'Excellent - ML Ready';
    } else if (score >= 70) {
        scoreCircle.classList.add('good');
        gradeText.classList.add('good');
        gradeText.textContent = 'Good - Minor issues';
    } else if (score >= 50) {
        scoreCircle.classList.add('fair');
        gradeText.classList.add('fair');
        gradeText.textContent = 'Fair - Needs work';
    } else {
        scoreCircle.classList.add('poor');
        gradeText.classList.add('poor');
        gradeText.textContent = 'Poor - Major issues';
    }
}

// ============================================
// Utilities
// ============================================

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = { success: '#34c759', error: '#ff3b30', warning: '#ff9500', info: '#007aff' };
    const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };
    
    notification.innerHTML = `<span style="font-weight:600">${icons[type]}</span> ${message}`;
    
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 16px',
        borderRadius: '8px',
        background: colors[type],
        color: 'white',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '1000',
        animation: 'slideIn 0.25s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '350px'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.25s ease';
        setTimeout(() => notification.remove(), 250);
    }, 3500);
}

function downloadData() {
    const tab = getActiveTab();
    if (!tab || tab.data.length === 0) {
        showNotification('No data to download', 'warning');
        return;
    }
    
    const csv = Papa.unparse(tab.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tab.title.replace(/\s+/g, '_')}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Saved to downloads folder', 'success');
}

// Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);
