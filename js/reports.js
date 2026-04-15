(function () {
    var allRows = [];
    var modal;

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

    function buildLocation(row) {
        var parts = [];
        if (row.location_floor) parts.push("Lt. " + row.location_floor);
        if (row.location_room) parts.push(row.location_room);
        if (parts.length > 0) return parts.join(" / ");
        return row.location_detail || "-";
    }

    function renderTable(rows) {
        var tbody = document.querySelector("#report-table tbody");
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">Tidak ada laporan ditemukan.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(r.report_number || "-") + "</td>" +
                "<td>" + escapeHtml(r.facility_name || r.title || "-") + "</td>" +
                "<td>" + escapeHtml(buildLocation(r)) + "</td>" +
                "<td>" + urgencyBadge(r.urgency) + "</td>" +
                "<td>" + statusBadge(r.status) + "</td>" +
                "<td class=\"text-end\"><button class=\"btn btn-sm btn-light-primary\" data-report-id=\"" + escapeHtml(r.report_id || "") + "\">Detail</button></td>" +
                "</tr>";
        }).join("");
    }

    function applySearch(keyword) {
        var q = (keyword || "").toLowerCase().trim();
        if (!q) {
            renderTable(allRows);
            return;
        }

        var filtered = allRows.filter(function (r) {
            return [
                r.report_number,
                r.title,
                r.facility_name,
                r.location_room,
                r.location_detail,
                r.urgency,
                r.status
            ].some(function (v) {
                return String(v || "").toLowerCase().indexOf(q) !== -1;
            });
        });

        renderTable(filtered);
    }

    async function loadReports() {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || "Gagal memuat data laporan");
        }

        allRows = json.data || [];
        renderTable(allRows);
    }

    function bindEvents() {
        var searchInput = document.querySelector('[data-kt-report-table-filter="search"]');
        if (searchInput) {
            searchInput.addEventListener("input", function (e) {
                applySearch(e.target.value);
            });
        }

        var addButton = document.getElementById("btn-add-report");
        if (addButton && modal) {
            addButton.addEventListener("click", function () {
                var form = document.getElementById("form-report");
                if (form) form.reset();
                modal.show();
            });
        }

        var formReport = document.getElementById("form-report");
        if (formReport && modal) {
            formReport.addEventListener("submit", function (e) {
                e.preventDefault();
                Swal.fire({
                    text: "Form input sudah terbuka. Integrasi create report bisa dilanjutkan berikutnya.",
                    icon: "info",
                    buttonsStyling: false,
                    confirmButtonText: "OK",
                    customClass: {
                        confirmButton: "btn btn-primary"
                    }
                }).then(function () {
                    modal.hide();
                });
            });
        }
    }

    async function init() {
        if (!requireLogin()) return;
        await loadSidebar();

        var modalEl = document.getElementById("modal-report");
        if (modalEl) {
            modal = new bootstrap.Modal(modalEl);
        }

        bindEvents();

        try {
            await loadReports();
        } catch (err) {
            Swal.fire({
                icon: "warning",
                title: "Data belum termuat",
                text: err.message || "Terjadi kesalahan saat mengambil laporan"
            });
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();