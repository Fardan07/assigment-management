$(document).ready(function () {
    if (!requireLogin()) return;

    const user = window.auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    $('#user-name').text(user.full_name || user.username || 'Pengguna');

    function statusBucket(status) {
        const s = String(status || '').toLowerCase();
        const processStatuses = ['draft', 'submitted', 'assigned', 'in_progress', 'on_progress', 'pending_review', 'rejected'];
        const doneStatuses = ['approved', 'solved', 'closed'];
        if (doneStatuses.includes(s)) return 'done';
        if (processStatuses.includes(s)) return 'process';
        return 'other';
    }

    async function loadUserStats() {
        try {
            const response = await window.auth.fetch(`${APP_CONFIG.apiBaseUrl}/maintenance-report/datatables`, {
                method: 'POST',
                body: JSON.stringify({ draw: 1, start: 0, length: 300 })
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.message || 'Gagal memuat data laporan.');

            const allRows = json.data || [];
            const data = allRows.filter(r => String(r.reporter_id || '') === String(user.user_id || ''));

            $('#stat-total').text(data.length);
            $('#stat-process').text(data.filter(r => statusBucket(r.status) === 'process').length);
            $('#stat-done').text(data.filter(r => statusBucket(r.status) === 'done').length);

            renderTable(data.slice(0, 5));
        } catch (err) {
            $('#landing-report-list').html('<tr><td colspan="3" class="text-center text-danger">Gagal memuat data</td></tr>');
        }
    }

    function renderTable(reports) {
        let html = '';
        reports.forEach(r => {
            const isDone = statusBucket(r.status) === 'done';
            const statusClass = isDone ? 'badge-light-success' : 'badge-light-warning';
            html += `
                <tr>
                    <td><span class="text-dark fw-bold">${r.facility_name || r.title || 'Fasilitas Umum'}</span></td>
                    <td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                    <td><span class="badge ${statusClass}">${r.status || '-'}</span></td>
                </tr>`;
        });
        $('#landing-report-list').html(html || '<tr><td colspan="3" class="text-center">Belum ada laporan</td></tr>');
    }

    loadUserStats();
});