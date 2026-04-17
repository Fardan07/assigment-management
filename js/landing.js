$(document).ready(function () {
    if (!requireLogin()) return;

    const user = window.auth.getUser();
    $('#user-name').text(user.full_name || 'Pengguna');

    // Fungsi mengambil statistik laporan user
    function loadUserStats() {
        $.get(`${APP_CONFIG.apiBaseUrl}/work-request?created_by=${user.user_id}`, function (res) {
            const data = res.data || [];
            $('#stat-total').text(data.length);
            
            const inProgress = data.filter(r => r.status === 'ASSIGNED' || r.status === 'SUBMITTED').length;
            const done = data.filter(r => r.status === 'COMPLETED' || r.status === 'CLOSED').length;
            
            $('#stat-process').text(inProgress);
            $('#stat-done').text(done);

            // Tampilkan 5 data terakhir di tabel
            renderTable(data.slice(0, 5));
        });
    }

    function renderTable(reports) {
        let html = '';
        reports.forEach(r => {
            const statusClass = r.status === 'CLOSED' ? 'badge-light-success' : 'badge-light-warning';
            html += `
                <tr>
                    <td><span class="text-dark fw-bold">${r.facility_name || 'Fasilitas Umum'}</span></td>
                    <td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                    <td><span class="badge ${statusClass}">${r.status}</span></td>
                </tr>`;
        });
        $('#landing-report-list').html(html || '<tr><td colspan="3" class="text-center">Belum ada laporan</td></tr>');
    }

    loadUserStats();
});