(function () {
    var allUsers = [];

    function normalizeRole(role) {
        var r = String(role || '').toUpperCase();
        if (r === 'USER') return 'REQUESTER';
        if (r === 'ADMIN') return 'WO_MANAGER';
        if (r === 'TEKNISI') return 'TECHNICIAN';
        return r;
    }

    function roleBadge(role) {
        var r = normalizeRole(role);
        if (r === 'WO_MANAGER') return '<span class="badge badge-light-danger">WO_MANAGER</span>';
        if (r === 'TECHNICIAN') return '<span class="badge badge-light-warning">TECHNICIAN</span>';
        if (r === 'REQUESTER') return '<span class="badge badge-light-primary">REQUESTER</span>';
        if (r === 'SITE_MANAGER') return '<span class="badge badge-light-info">SITE_MANAGER</span>';
        return '<span class="badge badge-light">' + escapeHtml(role || "-") + '</span>';
    }

    function activeBadge(active) {
        return active
            ? '<span class="badge badge-light-success">Aktif</span>'
            : '<span class="badge badge-light-danger">Nonaktif</span>';
    }

    function groupHeader(label, total, colorClass) {
        return '<tr class="bg-light-' + colorClass + '">' +
            '<td colspan="6" class="fw-bold text-' + colorClass + ' ps-4">' +
            label + ' <span class="badge badge-light ms-2">' + total + '</span>' +
            '</td>' +
            '</tr>';
    }

    function userRow(u) {
        var name = u.full_name || "-";
        var email = u.email ? ('<div class="text-gray-500 fs-7">' + escapeHtml(u.email) + '</div>') : "";

        return '<tr>' +
            '<td class="ps-4"><div class="fw-bold">' + escapeHtml(name) + '</div>' + email + '</td>' +
            '<td>' + escapeHtml(u.employee_code || "-") + '</td>' +
            '<td>' + roleBadge(u.role) + (u.job_title ? ('<div class="text-gray-500 fs-7 mt-1">' + escapeHtml(u.job_title) + '</div>') : '') + '</td>' +
            '<td>' + escapeHtml(u.department || "-") + '</td>' +
            '<td class="text-center">' + activeBadge(!!u.is_active) + '</td>' +
            '<td class="text-end pe-4"><button class="btn btn-sm btn-light-primary">Detail</button></td>' +
            '</tr>';
    }

    function renderTable(rows) {
        var tbody = document.querySelector('#user-table tbody');
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Data pengguna tidak ditemukan.</td></tr>';
            return;
        }

        var requesters = rows.filter(function (u) { return normalizeRole(u.role) === 'REQUESTER'; });
        var woManagers = rows.filter(function (u) { return normalizeRole(u.role) === 'WO_MANAGER'; });
        var technicians = rows.filter(function (u) { return normalizeRole(u.role) === 'TECHNICIAN'; });
        var siteManagers = rows.filter(function (u) { return normalizeRole(u.role) === 'SITE_MANAGER'; });

        var html = '';
        if (requesters.length > 0) {
            html += groupHeader('REQUESTER', requesters.length, 'primary');
            html += requesters.map(userRow).join('');
        }
        if (woManagers.length > 0) {
            html += groupHeader('WO_MANAGER', woManagers.length, 'danger');
            html += woManagers.map(userRow).join('');
        }
        if (technicians.length > 0) {
            html += groupHeader('TECHNICIAN', technicians.length, 'warning');
            html += technicians.map(userRow).join('');
        }
        if (siteManagers.length > 0) {
            html += groupHeader('SITE_MANAGER', siteManagers.length, 'info');
            html += siteManagers.map(userRow).join('');
        }

        tbody.innerHTML = html;
    }

    function applySearch(query) {
        var q = String(query || '').toLowerCase().trim();
        if (!q) {
            renderTable(allUsers);
            return;
        }

        var filtered = allUsers.filter(function (u) {
            return [u.full_name, u.employee_code, u.email, u.role, u.department, u.job_title]
                .some(function (v) { return String(v || '').toLowerCase().indexOf(q) !== -1; });
        });

        renderTable(filtered);
    }

    async function loadUsers() {
        var tbody = document.querySelector('#user-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Menghubungkan ke database...</td></tr>';
        }

        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + '/app-user/datatables', {
            method: 'POST',
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || 'Gagal memuat data user');
        }

        allUsers = json.data || [];
        renderTable(allUsers);
    }

    function bindEvents() {
        var searchInput = document.querySelector('input[placeholder="Cari nama atau NIP..."]');
        if (searchInput) {
            searchInput.addEventListener('input', function (e) {
                applySearch(e.target.value);
            });
        }

        var addButton = document.getElementById('btn-add-user');
        if (addButton) {
            addButton.addEventListener('click', function () {
                Swal.fire({
                    title: 'Tambah Pengguna',
                    text: 'Halaman form create bisa kita lanjutkan setelah ini.',
                    icon: 'info',
                    buttonsStyling: false,
                    confirmButtonText: 'OK',
                    customClass: { confirmButton: 'btn btn-primary' }
                });
            });
        }
    }

    document.addEventListener('DOMContentLoaded', async function () {
        if (!requireLogin()) return;
        await loadSidebar();

        // Set role badge in header
        try {
            var currentUser = window.auth ? window.auth.currentUser : null;
            if (!currentUser) {
                currentUser = await window.auth.getMe();
            }
            await syncCurrentUserRole();
            currentUser = window.auth.currentUser;
            var rawRole = resolveCurrentRole(currentUser);
            var roleText = rawRole ? String(rawRole).toUpperCase() : '-';
            var badgeEl = document.getElementById('current-role-badge');
            if (badgeEl) badgeEl.textContent = 'ROLE: ' + roleText;
        } catch (err) {
            console.warn('Failed to set role badge:', err && err.message ? err.message : err);
        }
        bindEvents();

        try {
            await loadUsers();
        } catch (err) {
            Swal.fire({
                icon: 'warning',
                title: 'Data belum termuat',
                text: err.message || 'Terjadi kesalahan saat mengambil data pengguna.'
            });
        }
    });
})();