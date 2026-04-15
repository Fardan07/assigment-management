(function () {
    function resolveDisplayRole(user) {
        if (!user) return "-";
        if (user.role && typeof user.role === "string") return user.role;
        if (Array.isArray(user.roles) && user.roles.length > 0) {
            var firstRole = user.roles[0];
            if (typeof firstRole === "string") return firstRole;
            if (firstRole && firstRole.code) return firstRole.code;
            if (firstRole && firstRole.name) return firstRole.name;
        }
        return "-";
    }

    function statusBadge(status) {
        var s = (status || "").toLowerCase();
        if (s === "pending") return '<span class="badge badge-light-danger">Pending</span>';
        if (s === "assigned") return '<span class="badge badge-light-primary">Assigned</span>';
        if (s === "on_progress") return '<span class="badge badge-light-warning">On Progress</span>';
        if (s === "solved") return '<span class="badge badge-light-success">Solved</span>';
        if (s === "closed") return '<span class="badge badge-light-info">Closed</span>';
        return '<span class="badge badge-light">' + escapeHtml(status || "-") + '</span>';
    }

    function urgencyBadge(urgency) {
        var u = (urgency || "").toLowerCase();
        if (u === "high") return '<span class="badge badge-light-danger">High</span>';
        if (u === "medium") return '<span class="badge badge-light-warning">Medium</span>';
        if (u === "low") return '<span class="badge badge-light-success">Low</span>';
        return '<span class="badge badge-light">' + escapeHtml(urgency || "-") + '</span>';
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = String(value);
    }

    function renderReportTable(rows) {
        var tbody = document.querySelector("#report-table tbody");
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-8">Belum ada data laporan.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(r.report_number || "-") + "</td>" +
                "<td>" + escapeHtml(r.title || "-") + "</td>" +
                "<td>" + escapeHtml(r.category_name || "-") + "</td>" +
                "<td>" + urgencyBadge(r.urgency) + "</td>" +
                "<td>" + statusBadge(r.status) + "</td>" +
                "</tr>";
        }).join("");
    }

    async function fetchDatatables(endpoint, length) {
        var url = APP_CONFIG.apiBaseUrl + "/" + endpoint + "/datatables";
        var response = await window.auth.fetch(url, {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: length || 100 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || ("Gagal mengambil data " + endpoint));
        }

        return json.data || [];
    }

    async function loadDashboardData() {
        var reports = await fetchDatatables("maintenance-report", 200);
        var categories = await fetchDatatables("issue-category", 200);
        var facilities = await fetchDatatables("facility-asset", 200);
        var users = await fetchDatatables("app-user", 200);

        var pending = 0;
        var onProgress = 0;
        var solved = 0;

        reports.forEach(function (r) {
            var status = (r.status || "").toLowerCase();
            if (status === "pending") pending += 1;
            if (status === "on_progress") onProgress += 1;
            if (status === "solved") solved += 1;
        });

        setText("stat-total", reports.length);
        setText("stat-pending", pending);
        setText("stat-progress", onProgress);
        setText("stat-solved", solved);
        setText("stat-category", categories.length);
        setText("stat-facility", facilities.length);
        setText("stat-users", users.length);

        renderReportTable(reports.slice(0, 8));
    }

    async function initDashboard() {
        if (!requireLogin()) return;

        await loadSidebar();

        var user = window.auth.currentUser;
        var role = resolveDisplayRole(user);
        setText("current-role-badge", "ROLE: " + role);

        var displayName = user && (user.full_name || user.username) ? (user.full_name || user.username) : "Pengguna";
        setText("welcome-text", "Halo " + displayName + ". Data dashboard diambil langsung dari database facility_helpdesk.");

        try {
            await loadDashboardData();
        } catch (err) {
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "warning",
                    title: "Data belum termuat",
                    text: err.message || "Tidak bisa mengambil data dari API."
                });
            }
            console.error(err);
        }
    }

    document.addEventListener("DOMContentLoaded", initDashboard);
})();
