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

    function setModalPhoto(imgId, emptyId, src, emptyText) {
        var img = document.getElementById(imgId);
        var empty = document.getElementById(emptyId);
        if (!img || !empty) return;

        if (!src) {
            img.style.display = "none";
            img.removeAttribute("src");
            empty.style.display = "block";
            empty.textContent = emptyText;
            return;
        }

        empty.style.display = "none";
        img.style.display = "block";
        img.src = src;
        img.onerror = function () {
            img.style.display = "none";
            empty.style.display = "block";
            empty.textContent = "Foto tidak dapat dimuat dari sumber.";
        };
    }

    async function loadAttachmentPhotoUrl(reportId, attachmentType) {
        if (!reportId || !attachmentType) return "";

        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/report-attachment/datatables", {
            method: "POST",
            body: JSON.stringify({
                draw: 1,
                start: 0,
                length: 200
            })
        });

        var json = await response.json();
        if (!response.ok) return "";

        var rows = (json.data || []).filter(function (row) {
            return String(row.report_id || "") === String(reportId) &&
                String(row.attachment_type || "").toLowerCase() === String(attachmentType).toLowerCase();
        });

        if (rows.length === 0) return "";

        rows.sort(function (a, b) {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        return resolvePhotoSrc(rows[0].file_url || "");
    }

    async function renderModalPhotos(report) {
        var beforeSrc = resolvePhotoSrc(report.photo_before_url);
        var afterSrc = resolvePhotoSrc(report.photo_after_url);

        setModalPhoto("modal-photo-before", "modal-photo-before-empty", beforeSrc, "Memuat foto awal...");
        setModalPhoto("modal-photo-after", "modal-photo-after-empty", afterSrc, "Memuat foto setelah perbaikan...");

        try {
            if (!beforeSrc) {
                beforeSrc = await loadAttachmentPhotoUrl(report.report_id, "before");
            }
            if (!afterSrc) {
                afterSrc = await loadAttachmentPhotoUrl(report.report_id, "after");
            }
        } catch (err) {
            console.warn("Gagal memuat lampiran foto:", err.message || err);
        }

        setModalPhoto("modal-photo-before", "modal-photo-before-empty", beforeSrc, "Tidak ada foto awal.");
        setModalPhoto("modal-photo-after", "modal-photo-after-empty", afterSrc, "Tidak ada foto setelah perbaikan.");
    }

    function statusBadge(status) {
        var s = String(status || "").toLowerCase();
        if (s === "pending_review") return '<span class="badge badge-light-info">Pending Review</span>';
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
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">Tidak ada laporan untuk di-review.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(r.report_number || "-") + "</td>" +
                "<td>" + escapeHtml(r.title || "-") + "</td>" +
                "<td>" + escapeHtml(r.assigned_to_name || "-") + "</td>" +
                "<td>" + statusBadge(r.status) + "</td>" +
                "<td>" + urgencyBadge(r.urgency) + "</td>" +
                "<td class=\"text-end\"><button class=\"btn btn-sm btn-light-primary btn-review\" data-report-id=\"" + escapeHtml(r.report_id || "") + "\">Lihat Detail</button></td>" +
                "</tr>";
        }).join("");
    }

    function applyFilters() {
        var query = '';
        var searchInput = document.querySelector('[data-kt-report-table-filter="search"]');
        if (searchInput) query = searchInput.value.toLowerCase().trim();
        
        var ddlStatus = document.getElementById("status-filter");
        var statusFilter = ddlStatus ? ddlStatus.value : "all";

        var filtered = allRows.filter(function (r) {
            var s = String(r.status || "").toLowerCase().trim();
            var matchesStatus = true;
            if (statusFilter === "approved") {
                matchesStatus = (s === "approved" || s === "solved" || s === "closed");
            } else if (statusFilter === "rejected") {
                matchesStatus = (s === "rejected");
            }

            var matchesSearch = true;
            if (query) {
                matchesSearch = [
                    r.report_number,
                    r.title,
                    r.assigned_to_name,
                    r.urgency
                ].some(function (v) {
                    return String(v || "").toLowerCase().indexOf(query) !== -1;
                });
            }

            return matchesStatus && matchesSearch;
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
                    length: 200
                })
            });

            var json = await response.json();
            if (!response.ok) {
                throw new Error(json.message || "Gagal memuat data laporan");
            }

            // Get history (approved, rejected, solved, closed)
            allRows = (json.data || []).filter(function (r) {
                var status = String(r.status || "").toLowerCase().trim();
                return status === "approved" || status === "rejected" || status === "solved" || status === "closed";
            }).map(function (r) {
                // Add assigned_to_name if not available
                r.assigned_to_name = r.assigned_to_name || r.assignee_name || r.technician_name || "Teknisi";
                return r;
            });
            // Sort newest first
            allRows.sort(function(a,b) {
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });
            applyFilters();
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "warning",
                title: "Data belum termuat",
                text: err.message || "Terjadi kesalahan saat mengambil data laporan"
            });
        }
    }

    async function reviewReport(reportId, decision, rejectionReason) {
        try {
            var updateData = {};

            if (decision === "approve") {
                updateData.status = "approved";
                updateData.closed_at = new Date().toISOString();
            } else if (decision === "reject") {
                if (!rejectionReason) {
                    throw new Error("Alasan penolakan harus diisi");
                }
                updateData.status = "rejected";
                updateData.rejection_reason = rejectionReason;
            }

            updateData.report_id = reportId;

            var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/update", {
                method: "POST",
                body: JSON.stringify(updateData)
            });

            var json = await response.json();
            if (!response.ok) throw new Error(json.message || "Gagal proses review");

            var message = decision === "approve" ? "Laporan berhasil disetujui" : "Laporan berhasil ditolak untuk revisi";
            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: message
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
            searchInput.addEventListener("input", applyFilters);
        }

        var statusFilter = document.getElementById("status-filter");
        if (statusFilter) {
            statusFilter.addEventListener("change", applyFilters);
        }

        document.addEventListener("click", function (e) {
            if (e.target.classList.contains("btn-review")) {
                var reportId = e.target.getAttribute("data-report-id");
                var report = allRows.find(function (r) { return r.report_id === reportId; });
                if (report && modal) {
                    document.getElementById("modal-report-title").textContent = report.title;
                    document.getElementById("modal-technician-info").textContent = "Teknisi: " + (report.assigned_to_name || "-");
                    document.getElementById("modal-technician-note").textContent = "Catatan Teknisi: " + (report.technician_note || "-");
                    
                    var rejectEl = document.getElementById("modal-rejection-reason");
                    if (report.status === "rejected" || report.status === "revisi") {
                        rejectEl.textContent = "Alasan Ditolak / Revisi: " + (report.rejection_reason || "Tidak ada alasan");
                        rejectEl.style.display = "block";
                    } else {
                        rejectEl.style.display = "none";
                    }
                    
                    modal.show();
                    renderModalPhotos(report);
                }
            }
        });
    }

    async function init() {
        if (!requireLogin()) return;
        await loadSidebar();

        // Set role badge in header for Site Manager view
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

        var modalEl = document.getElementById("modal-review");
        if (modalEl) {
            modal = new bootstrap.Modal(modalEl);
        }

        bindEvents();

        try {
            await loadReports();
        } catch (err) {
            console.error(err);
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
