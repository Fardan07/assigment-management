(function () {
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

    async function loadReports() {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });
        var json = await response.json();
        if (!response.ok) throw new Error(json.message || "Gagal memuat laporan");

        var rows = json.data || [];
        var tbody = document.querySelector("#report-table tbody");
        if (!tbody) return;

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-8">Belum ada laporan.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(r.report_number || "-") + "</td>" +
                "<td>" + escapeHtml(r.title || "-") + "</td>" +
                "<td>" + escapeHtml(r.reporter_name || "-") + "</td>" +
                "<td>" + escapeHtml(r.category_name || "-") + "</td>" +
                "<td>" + urgencyBadge(r.urgency) + "</td>" +
                "<td>" + statusBadge(r.status) + "</td>" +
                "<td>" + escapeHtml((r.reported_at || "").toString().slice(0, 10) || "-") + "</td>" +
                "</tr>";
        }).join("");
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!requireLogin()) return;
        await loadSidebar();
        try {
            await loadReports();
        } catch (err) {
            Swal.fire({ icon: "warning", title: "Gagal memuat data", text: err.message || "Terjadi kesalahan." });
        }
    });
})();
