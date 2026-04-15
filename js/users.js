(function () {
    function roleBadge(role) {
        var r = (role || "").toUpperCase();
        if (r === "ADMIN") return '<span class="badge badge-light-danger">ADMIN</span>';
        if (r === "TEKNISI") return '<span class="badge badge-light-warning">TEKNISI</span>';
        if (r === "USER") return '<span class="badge badge-light-primary">USER</span>';
        return '<span class="badge badge-light">' + escapeHtml(role || "-") + '</span>';
    }

    function activeBadge(flag) {
        return flag ? '<span class="badge badge-light-success">Aktif</span>' : '<span class="badge badge-light-danger">Nonaktif</span>';
    }

    async function loadUsers() {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/app-user/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });
        var json = await response.json();
        if (!response.ok) throw new Error(json.message || "Gagal memuat data user");

        var rows = json.data || [];
        var tbody = document.querySelector("#user-table tbody");
        if (!tbody) return;

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">Belum ada data user.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (u) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(u.employee_code || "-") + "</td>" +
                "<td>" + escapeHtml(u.full_name || "-") + "</td>" +
                "<td>" + escapeHtml(u.email || "-") + "</td>" +
                "<td>" + roleBadge(u.role) + "</td>" +
                "<td>" + escapeHtml(u.department || "-") + "</td>" +
                "<td>" + activeBadge(!!u.is_active) + "</td>" +
                "</tr>";
        }).join("");
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!requireLogin()) return;
        await loadSidebar();
        try {
            await loadUsers();
        } catch (err) {
            Swal.fire({ icon: "warning", title: "Gagal memuat data", text: err.message || "Terjadi kesalahan." });
        }
    });
})();
