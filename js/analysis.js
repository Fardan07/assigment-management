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

        if (rows.length === 0) return;
        
        // Ambil data terbaru (index 0)
        var latest = rows[0];
        
        // Estimasi per jam dan hari (dalam kWh)
        // Jika power dalam Watt konstan: (power * hours) / 1000 
        var est1Jam = (latest.power * 1) / 1000;
        var est1Hari = (latest.power * 24) / 1000;

        var col = document.createElement('div');
        col.className = 'col-md-12';
        col.innerHTML = `
            <div class="row g-4">
                <div class="col-md-4">
                    <div class="card p-4 h-100 bg-light-primary border-primary border border-dashed rounded">
                        <div class="fw-bold fs-4 text-gray-800 mb-4">Sensor IoT Utama</div>
                        <div class="d-flex flex-column gap-2">
                            <div class="fs-6 d-flex justify-content-between"><span class="text-muted">Voltage:</span> <span class="fw-bolder">${formatNumber(latest.voltage, 2)} V</span></div>
                            <div class="fs-6 d-flex justify-content-between"><span class="text-muted">Power:</span> <span class="fw-bolder">${formatNumber(latest.power, 2)} W</span></div>
                            <div class="fs-6 d-flex justify-content-between"><span class="text-muted">Energy:</span> <span class="fw-bolder">${formatNumber(latest.energy, 2)} kWh</span></div>
                        </div>
                        <div class="text-muted fs-8 mt-4 pt-3 border-top border-gray-300">Terakhir Update: ${new Date(latest.created_at).toLocaleString('id-ID')}</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card p-4 h-100 bg-light-success border-success border border-dashed rounded d-flex flex-column justify-content-center align-items-center text-center">
                        <div class="text-success fw-bold fs-5 mb-2">Estimasi Penggunaan 1 Jam</div>
                        <div class="fw-bolder fs-1 text-gray-800">${formatNumber(est1Jam, 4)} <span class="fs-4 text-muted">kWh</span></div>
                        <div class="text-muted fs-8 mt-2">Berdasarkan Power saat ini</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card p-4 h-100 bg-light-warning border-warning border border-dashed rounded d-flex flex-column justify-content-center align-items-center text-center">
                        <div class="text-warning fw-bold fs-5 mb-2">Estimasi Penggunaan 1 Hari</div>
                        <div class="fw-bolder fs-1 text-gray-800">${formatNumber(est1Hari, 4)} <span class="fs-4 text-muted">kWh</span></div>
                        <div class="text-muted fs-8 mt-2">Berdasarkan Power saat ini</div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);
    }

    function renderTable(rows) {
        var tbody = document.getElementById('iot-table-body');
        if (!tbody) return;
        tbody.innerHTML = rows.map(function (r) {
            return '<tr>' +
                '<td>' + escapeHtml(String(r.id)) + '</td>' +
                '<td>' + formatNumber(r.voltage, 2) + '</td>' +
                '<td>' + formatNumber(r.power, 2) + '</td>' +
                '<td>' + formatNumber(r.energy, 2) + '</td>' +
                '<td>' + escapeHtml(new Date(r.created_at).toLocaleString('id-ID')) + '</td>' +
                '</tr>';
        }).join('');
    }

    async function fetchIoTData() {
        var endpoint = 'https://z-learn.my.id/api/data';
        try {
            var r = await fetch(endpoint, { method: 'GET' });
            var j = await r.json();
            if (!r.ok) throw new Error('Failed to fetch');
            return j;
        } catch (err) {
            console.warn('IoT fetch failed:', err);
            return [];
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

        // Fetch data periodically
        setInterval(loadAndRender, 3000);
    }

    async function loadAndRender() {
        var rows = await fetchIoTData();
        renderCards(rows);
        renderTable(rows);
        
        // render initial chart 
        if (rows && rows.length > 0) {
            renderDeviceUsage(rows);
        }
    }

    var usageChart = null;

    async function renderDeviceUsage(rows) {
        if (!rows || rows.length === 0) return;
        
        // Map the real-time data for the chart (datetime string and power)
        // The API returns newest first, so we reverse it for chart display (left to right = oldest to newest)
        var chartData = rows.map(function(item) {
            return {
                date: new Date(item.created_at).toLocaleTimeString('id-ID'), // e.g. "20:00:00"
                power: item.power
            };
        }).reverse();

        var labels = chartData.map(function (h) { return h.date; });
        var data = chartData.map(function (h) { return Number(h.power || 0); });

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
                    label: 'Power (W) - Realtime',
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
                    y: { 
                        display: true, 
                        beginAtZero: true,
                        suggestedMax: function(context) {
                            return Math.max(...data) * 1.5;
                        }
                    }
                },
                plugins: { legend: { display: true } },
                animation: { duration: 0 } // nonaktifkan animasi agar update real-time lebih smooth
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
