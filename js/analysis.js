(function () {
    // Renders summary cards and table for IoT lamp data.

    function mockData() {
        return [
            {
                device_id: 'lamp-001',
                name: 'Lampu Aula',
                voltage: 220.1,
                current: 0.45,
                power: 99.05,
                energy: 12.34,
                power_factor: 0.98,
                status: 'online',
                last_seen: new Date().toISOString()
            },
            {
                device_id: 'lamp-002',
                name: 'Lampu Koridor',
                voltage: 219.5,
                current: 0.32,
                power: 70.24,
                energy: 8.91,
                power_factor: 0.95,
                status: 'online',
                last_seen: new Date().toISOString()
            },
            {
                device_id: 'lamp-003',
                name: 'Lampu Parkir',
                voltage: 218.9,
                current: 0.12,
                power: 26.27,
                energy: 3.14,
                power_factor: 0.92,
                status: 'offline',
                last_seen: new Date(Date.now() - 1000 * 60 * 60).toISOString()
            }
        ];
    }

    function formatNumber(v, digits) {
        return (typeof v === 'number') ? v.toFixed(digits || 2) : '-';
    }

    function renderCards(rows) {
        var container = document.getElementById('summary-cards');
        if (!container) return;
        container.innerHTML = '';

        rows.forEach(function (r) {
            var col = document.createElement('div');
            col.className = 'col-md-4';
            col.innerHTML = '\n                <div class="card p-4 h-100">\n                    <div class="d-flex justify-content-between align-items-start">\n                        <div>\n                            <div class="fw-bold">' + escapeHtml(r.name) + '</div>\n                            <div class="fs-8 text-muted">' + escapeHtml(r.device_id) + '</div>\n                        </div>\n                        <div class="text-end">\n                            <div class="fs-6 fw-bolder">' + formatNumber(r.power, 2) + ' W</div>\n                            <div class="fs-8 text-muted">' + formatNumber(r.energy, 2) + ' kWh</div>\n                        </div>\n                    </div>\n                    <div class="mt-3">\n                        <div class="d-flex gap-3">\n                            <div class="text-muted fs-8">V: ' + formatNumber(r.voltage,2) + ' V</div>\n                            <div class="text-muted fs-8">I: ' + formatNumber(r.current,2) + ' A</div>\n                            <div class="text-muted fs-8">PF: ' + formatNumber(r.power_factor,2) + '</div>\n                        </div>\n                    </div>\n                </div>\n            ';
            container.appendChild(col);
        });
    }

    function renderTable(rows) {
        var tbody = document.getElementById('iot-table-body');
        if (!tbody) return;
        tbody.innerHTML = rows.map(function (r) {
            return '<tr>' +
                '<td>' + escapeHtml(r.device_id) + '</td>' +
                '<td>' + escapeHtml(r.name) + '</td>' +
                '<td>' + formatNumber(r.voltage,2) + '</td>' +
                '<td>' + formatNumber(r.current,2) + '</td>' +
                '<td>' + formatNumber(r.power,2) + '</td>' +
                '<td>' + formatNumber(r.energy,2) + '</td>' +
                '<td>' + formatNumber(r.power_factor,2) + '</td>' +
                '<td>' + escapeHtml(String(r.status || '-')) + '</td>' +
                '<td>' + escapeHtml(String(r.last_seen || '-')) + '</td>' +
                '</tr>';
        }).join('');
    }

    async function fetchIoTData() {
        var endpoint = (APP_CONFIG && APP_CONFIG.apiBaseUrl) ? APP_CONFIG.apiBaseUrl + '/iot/lamp-data' : '/iot/lamp-data';
        try {
            if (window.auth && window.auth.fetch) {
                var resp = await window.auth.fetch(endpoint, { method: 'GET' });
                var json = await resp.json();
                if (!resp.ok) throw new Error(json.message || 'Failed to fetch');
                return (json.data || json);
            } else {
                var r = await fetch(endpoint, { method: 'GET' });
                var j = await r.json();
                if (!r.ok) throw new Error(j.message || 'Failed to fetch');
                return (j.data || j);
            }
        } catch (err) {
            console.warn('IoT fetch failed, using mock data:', err && err.message ? err.message : err);
            return mockData();
        }
    }

    async function init() {
        if (!requireLogin()) return;
        await loadSidebar();

        // ensure role badge is set as other pages do
        try {
            var currentUser = window.auth ? window.auth.currentUser : null;
            if (!currentUser) currentUser = await window.auth.getMe();
            await syncCurrentUserRole();
            currentUser = window.auth.currentUser;
            var rawRole = resolveCurrentRole(currentUser);
            var roleText = rawRole ? String(rawRole).toUpperCase() : '-';
            var badgeEl = document.getElementById('current-role-badge');
            if (badgeEl) badgeEl.textContent = 'ROLE: ' + roleText;
        } catch (err) {
            console.warn('Failed to set role badge:', err && err.message ? err.message : err);
        }

        var btn = document.getElementById('btn-refresh');
        if (btn) btn.addEventListener('click', loadAndRender);
        await loadAndRender();

        // setup device selector and chart
        setupDeviceSelector();
    }

    async function loadAndRender() {
        var rows = await fetchIoTData();
        renderCards(rows);
        renderTable(rows);
        populateDeviceSelect(rows);
        // render initial chart for first device
        if (rows && rows.length > 0) {
            renderDeviceUsage(rows[0].device_id);
        }
    }

    function populateDeviceSelect(rows) {
        var sel = document.getElementById('device-select');
        if (!sel) return;
        sel.innerHTML = '';
        rows.forEach(function (r, idx) {
            var opt = document.createElement('option');
            opt.value = r.device_id;
            opt.textContent = (r.name || r.device_id);
            sel.appendChild(opt);
        });
        sel.addEventListener('change', function () {
            renderDeviceUsage(this.value);
        });
    }

    function generateMockHistory(deviceId, days) {
        days = days || 30;
        var data = [];
        for (var i = days - 1; i >= 0; i--) {
            var dt = new Date();
            dt.setDate(dt.getDate() - i);
            // simple pseudo-random but stable-ish values using deviceId
            var base = (deviceId.charCodeAt(deviceId.length - 1) || 1) * 5;
            var power = base + Math.abs(Math.sin(i / 3)) * 100 * (0.6 + Math.random() * 0.8);
            data.push({
                date: dt.toISOString().slice(0, 10),
                power: Number(power.toFixed(2))
            });
        }
        return data;
    }

    async function fetchDeviceHistory(deviceId, days) {
        var endpoint = (APP_CONFIG && APP_CONFIG.apiBaseUrl) ? APP_CONFIG.apiBaseUrl + '/iot/lamp-history?device_id=' + encodeURIComponent(deviceId) + '&days=' + (days || 30) : '/iot/lamp-history?device_id=' + encodeURIComponent(deviceId) + '&days=' + (days || 30);
        try {
            if (window.auth && window.auth.fetch) {
                var resp = await window.auth.fetch(endpoint);
                var json = await resp.json();
                if (!resp.ok) throw new Error(json.message || 'Failed to fetch history');
                return (json.data || json);
            } else {
                var r = await fetch(endpoint);
                var j = await r.json();
                if (!r.ok) throw new Error(j.message || 'Failed to fetch history');
                return (j.data || j);
            }
        } catch (err) {
            console.warn('History fetch failed, generating mock history:', err && err.message ? err.message : err);
            return generateMockHistory(deviceId, days || 30);
        }
    }

    var usageChart = null;

    function setupDeviceSelector() {
        var sel = document.getElementById('device-select');
        if (!sel) return;
        // if already populated, do nothing (populateDeviceSelect will add change listener)
    }

    async function renderDeviceUsage(deviceId) {
        if (!deviceId) return;
        var hist = await fetchDeviceHistory(deviceId, 30);
        var labels = hist.map(function (h) { return h.date; });
        var data = hist.map(function (h) { return Number(h.power || 0); });

        var ctx = document.getElementById('usage-chart').getContext('2d');
        if (usageChart) {
            usageChart.data.labels = labels;
            usageChart.data.datasets[0].data = data;
            usageChart.update();
            return;
        }

        usageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Power (W)',
                    data: data,
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78,115,223,0.05)',
                    fill: true,
                    pointRadius: 2,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: true },
                    y: { display: true, beginAtZero: true }
                },
                plugins: { legend: { display: true } }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
