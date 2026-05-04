(function () {
    var allRows = [];
    var modal;

    function getApiOrigin() {
        try {
            var url = new URL(APP_CONFIG.apiBaseUrl);
            return url.origin;
        } catch (e) {
            return "";
        }
    }

    function resolvePhotoSrc(rawUrl) {
        var url = String(rawUrl || "").trim();
        if (!url) return "";
        if (url.indexOf("data:image/") === 0) return url;
        if (/^https?:\/\//i.test(url)) return url;
        if (url.charAt(0) === "/") {
            var origin = getApiOrigin();
            return origin ? (origin + url) : url;
        }
        return url;
    }

    function statusBadge(status) {
        var s = String(status || "").toLowerCase();
        if (s === "submitted") return '<span class="badge badge-light-danger">Submitted</span>';
        return '<span class="badge badge-light">' + escapeHtml(status || "-") + '</span>';
    }

    function urgencyBadge(urgency) {
        var u = (urgency || "").toLowerCase();
        if (u === "high") return '<span class="badge badge-light-danger">High</span>';
        if (u === "medium") return '<span class="badge badge-light-warning">Medium</span>';
        if (u === "low") return '<span class="badge badge-light-success">Low</span>';
        return '<span class="badge badge-light">' + escapeHtml(urgency || "-") + '</span>';
    }

    function renderTable(rows) {
        var tbody = document.querySelector("#report-table tbody");
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">Tidak ada work order ditemukan.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(r.report_number || "-") + "</td>" +
                "<td>" + escapeHtml(r.title || "-") + "</td>" +
                "<td>" + escapeHtml(r.category_name || "-") + "</td>" +
                "<td>" + urgencyBadge(r.urgency) + "</td>" +
                "<td>" + escapeHtml(r.reporter_name || "-") + "</td>" +
                "<td class=\"text-end\">" +
                    "<button class=\"btn btn-sm btn-light-info me-2 btn-detail\" data-report-id=\"" + escapeHtml(r.report_id || "") + "\">Detail</button>" +
                    "<button class=\"btn btn-sm btn-light-primary btn-assign\" data-report-id=\"" + escapeHtml(r.report_id || "") + "\">Assign</button>" +
                "</td>" +
                "</tr>";
        }).join("");
    }

    function renderDetailHtml(report) {
        var photoSrc = resolvePhotoSrc(report.photo_before_url);
        var photo = photoSrc
            ? '<img src="' + escapeHtml(photoSrc) + '" alt="Foto laporan" style="max-width:100%;max-height:260px;border-radius:8px;object-fit:contain;" onerror="this.style.display=\'none\';this.parentElement.insertAdjacentHTML(\'beforeend\',\'<div class=&quot;text-muted mt-2&quot;>Foto tidak dapat dimuat dari URL sumber.</div>\')" />'
            : '<div class="text-muted">Tidak ada foto dilampirkan.</div>';

        return '' +
            '<div class="text-start">' +
                '<div class="mb-3"><strong>No. Laporan:</strong> ' + escapeHtml(report.report_number || '-') + '</div>' +
                '<div class="mb-3"><strong>Judul:</strong> ' + escapeHtml(report.title || '-') + '</div>' +
                '<div class="mb-3"><strong>Pelapor:</strong> ' + escapeHtml(report.reporter_name || '-') + '</div>' +
                '<div class="mb-3"><strong>Kategori:</strong> ' + escapeHtml(report.category_name || '-') + '</div>' +
                '<div class="mb-3"><strong>Lokasi:</strong> ' + escapeHtml(report.location_floor || '-') + ' / ' + escapeHtml(report.location_room || '-') + '</div>' +
                '<div class="mb-3"><strong>Deskripsi:</strong><br>' + escapeHtml(report.description || '-') + '</div>' +
                '<div class="mb-2"><strong>Foto Submit:</strong></div>' +
                '<div class="border rounded p-2 bg-light">' + photo + '</div>' +
            '</div>';
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
                r.category_name,
                r.reporter_name,
                r.urgency
            ].some(function (v) {
                return String(v || "").toLowerCase().indexOf(q) !== -1;
            });
        });

        renderTable(filtered);
    }

    async function loadReports() {
        try {
            var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/datatables", {
                method: "POST",
                body: JSON.stringify({
                    draw: 1,
                    start: 0,
                    length: 200,
                    search: { value: "submitted" }
                })
            });

            var json = await response.json();
            if (!response.ok) {
                throw new Error(json.message || "Gagal memuat data work order");
            }

            // Filter for submitted status only
            allRows = (json.data || []).filter(function (r) {
                return String(r.status || "").toLowerCase() === "submitted";
            });
            renderTable(allRows);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "warning",
                title: "Data belum termuat",
                text: err.message || "Terjadi kesalahan saat mengambil work order"
            });
        }
    }

    async function loadTechnicians() {
        try {
            var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/app-user/datatables", {
                method: "POST",
                body: JSON.stringify({
                    draw: 1,
                    start: 0,
                    length: 100
                })
            });

            var json = await response.json();
            if (!response.ok) throw new Error("Gagal memuat teknisi");

            var technicians = (json.data || []).filter(function (u) {
                return String(u.role || "").toUpperCase() === "TECHNICIAN";
            });

            var select = document.querySelector('select[name="technician_id"]');
            if (select) {
                var html = '<option value="">-- Pilih Teknisi --</option>';
                technicians.forEach(function (t) {
                    html += '<option value="' + escapeHtml(t.user_id) + '">' + 
                        escapeHtml(t.full_name || t.employee_code) + 
                        '</option>';
                });
                select.innerHTML = html;
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function assignReport(reportId, technicianId, note) {
        try {
            var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/update", {
                method: "POST",
                body: JSON.stringify({
                    report_id: reportId,
                    assigned_to_id: technicianId,
                    status: "assigned",
                    admin_note: note,
                    assigned_at: new Date().toISOString()
                })
            });

            var json = await response.json();
            if (!response.ok) throw new Error(json.message || "Gagal assign report");

            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Laporan berhasil diassign ke teknisi"
            }).then(function () {
                modal.hide();
                loadReports();
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message
            });
        }
    }

    function bindEvents() {
        var searchInput = document.querySelector('[data-kt-report-table-filter="search"]');
        if (searchInput) {
            searchInput.addEventListener("input", function (e) {
                applySearch(e.target.value);
            });
        }

        document.addEventListener("click", function (e) {
            if (e.target.classList.contains("btn-detail")) {
                var detailId = e.target.getAttribute("data-report-id");
                var detailReport = allRows.find(function (r) { return r.report_id === detailId; });
                if (detailReport) {
                    Swal.fire({
                        title: "Detail Laporan",
                        html: renderDetailHtml(detailReport),
                        width: 760,
                        confirmButtonText: "Tutup",
                        buttonsStyling: false,
                        customClass: { confirmButton: "btn btn-primary" }
                    });
                }
                return;
            }

            if (e.target.classList.contains("btn-assign")) {
                var reportId = e.target.getAttribute("data-report-id");
                var report = allRows.find(function (r) { return r.report_id === reportId; });
                if (report && modal) {
                    document.querySelector('input[name="report_id"]').value = reportId;
                    document.getElementById("modal-report-title").textContent = report.title;
                    document.getElementById("modal-report-description").textContent = report.description;
                    modal.show();
                }
            }
        });

        var formAssign = document.getElementById("form-assign");
        if (formAssign) {
            formAssign.addEventListener("submit", function (e) {
                e.preventDefault();
                var reportId = document.querySelector('input[name="report_id"]').value;
                var technicianId = document.querySelector('select[name="technician_id"]').value;
                var note = document.querySelector('textarea[name="admin_note"]').value;

                if (!technicianId) {
                    Swal.fire({
                        icon: "warning",
                        title: "Validasi",
                        text: "Pilih teknisi terlebih dahulu"
                    });
                    return;
                }

                assignReport(reportId, technicianId, note);
            });
        }
    }

    async function init() {
        if (!requireLogin()) return;
        await loadSidebar();

        var modalEl = document.getElementById("modal-assign");
        if (modalEl) {
            modal = new bootstrap.Modal(modalEl);
        }

        await loadTechnicians();
        bindEvents();

        try {
            await loadReports();
        } catch (err) {
            console.error(err);
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
