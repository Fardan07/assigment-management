(function () {
    var allRows = [];
    var modal;
    var categoryOptions = [];
    var currentReporterId = null;

    function normalizeStatus(status) {
        return String(status || "").toLowerCase();
    }

    function statusBadge(status) {
        var s = normalizeStatus(status);
        if (s === "draft") return '<span class="badge badge-light">Draft</span>';
        if (s === "submitted" || s === "pending") return '<span class="badge badge-light-danger">Submitted</span>';
        if (s === "rejected_by_wom") return '<span class="badge badge-light-danger">Rejected by WOM</span>';
        if (s === "assigned") return '<span class="badge badge-light-primary">Assigned</span>';
        if (s === "in_progress" || s === "on_progress") return '<span class="badge badge-light-warning">In Progress</span>';
        if (s === "pending_review") return '<span class="badge badge-light-info">Pending Review</span>';
        if (s === "rejected") return '<span class="badge badge-light-danger">Rejected</span>';
        if (s === "approved" || s === "solved") return '<span class="badge badge-light-success">Approved</span>';
        if (s === "closed") return '<span class="badge badge-light-success">Closed</span>';
        if (s === "cancelled") return '<span class="badge badge-light-dark">Cancelled</span>';
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

    async function loadCategories() {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/issue-category/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || "Gagal memuat kategori");
        }

        categoryOptions = (json.data || []).map(function (c) {
            return {
                id: c.category_id,
                name: c.category_name,
                code: c.category_code
            };
        });

        var select = document.querySelector('select[name="category"]');
        if (!select || categoryOptions.length === 0) return;

        select.innerHTML = categoryOptions.map(function (c) {
            return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + '</option>';
        }).join('');
    }

    async function resolveReporterId() {
        var user = window.auth ? window.auth.currentUser : null;
        if (!user) return;

        var identityEmail = String(user.email || '').toLowerCase().trim();
        var identityName = String(user.full_name || user.username || '').toLowerCase().trim();

        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/app-user/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 300 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || "Gagal memuat data user");
        }

        var match = (json.data || []).find(function (u) {
            var mail = String(u.email || '').toLowerCase();
            var name = String(u.full_name || '').toLowerCase();
            return (identityEmail && mail === identityEmail) || (identityName && name === identityName);
        });

        if (match && match.user_id) {
            currentReporterId = match.user_id;
        }
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
                var preview = document.getElementById("photo-preview");
                if (preview) preview.innerHTML = "";
                modal.show();
            });
        }

        // Handle file preview
        var photoInput = document.querySelector('input[name="photo_before"]');
        if (photoInput) {
            photoInput.addEventListener("change", function (e) {
                var file = e.target.files[0];
                var preview = document.getElementById("photo-preview");
                if (!preview) return;
                
                preview.innerHTML = "";
                if (file) {
                    var reader = new FileReader();
                    reader.onload = function (event) {
                        var img = document.createElement("img");
                        img.src = event.target.result;
                        img.style.maxWidth = "200px";
                        img.style.maxHeight = "200px";
                        img.className = "rounded";
                        preview.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        var formReport = document.getElementById("form-report");
        if (formReport && modal) {
            formReport.addEventListener("submit", function (e) {
                e.preventDefault();
                submitReport();
            });
        }
    }

    async function submitReport() {
        var form = document.getElementById("form-report");
        if (!form) return;

        var formData = new FormData(form);
        var photoFile = document.querySelector('input[name="photo_before"]').files[0];
        var categoryValue = String(formData.get("category") || "");
        var resolvedCategoryId = getCategoryIdFromName(categoryValue);
        var data = {
            report_number: generateReportNumber(),
            title: formData.get("title"),
            category_id: resolvedCategoryId,
            urgency: mapUrgency(formData.get("urgency")),
            description: formData.get("description"),
            location_floor: String(formData.get("location_floor") || "").trim() || null,
            location_room: String(formData.get("location_room") || "").trim() || null,
            location_detail: String(formData.get("location_detail") || "").trim() || null,
            reporter_id: currentReporterId,
            status: "submitted"
        };

        if (photoFile) {
            try {
                data.photo_before_url = await fileToDataUrl(photoFile);
            } catch (e) {
                console.warn("Gagal membaca file foto:", e);
            }
        }

        if (!data.title || !data.category_id || !data.description || !data.reporter_id) {
            Swal.fire({
                icon: "warning",
                title: "Validasi Gagal",
                text: "Judul, kategori, deskripsi, dan data pelapor harus valid"
            });
            return;
        }

        try {
            var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/create", {
                method: "POST",
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json"
                }
            });

            var json = await response.json();
            if (!response.ok) {
                var detailError = "";
                if (json && Array.isArray(json.errors) && json.errors.length > 0) {
                    var first = json.errors[0];
                    detailError = (first.field ? (first.field + ": ") : "") + (first.message || "");
                }
                throw new Error(detailError || json.message || "Gagal membuat laporan");
            }

            var createdData = (json && json.data) ? json.data : {};

            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Laporan berhasil dibuat" + (createdData.report_number ? (" dengan nomor: " + createdData.report_number) : "")
            }).then(function () {
                modal.hide();
                loadReports();
            });
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message || "Terjadi kesalahan saat membuat laporan"
            });
        }
    }

    function fileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getCategoryIdFromName(categoryName) {
        if (!categoryName) return null;
        if (/^[0-9a-fA-F-]{36}$/.test(categoryName)) return categoryName;

        var selected = categoryOptions.find(function (c) {
            return String(c.name || '').toLowerCase() === String(categoryName).toLowerCase() ||
                String(c.code || '').toLowerCase() === String(categoryName).toLowerCase();
        });
        if (selected) return selected.id;

        var categoryMap = {
            "AC": "cat-001",
            "Listrik": "cat-002",
            "Air": "cat-003",
            "Furniture": "cat-004"
        };
        return categoryMap[categoryName] || null;
    }

    function mapUrgency(urgencyText) {
        if (urgencyText === "Sedang") return "medium";
        if (urgencyText === "Darurat") return "high";
        return "low";
    }

    function generateReportNumber() {
        var now = new Date();
        var yyyy = now.getFullYear();
        var mm = String(now.getMonth() + 1).padStart(2, "0");
        var dd = String(now.getDate()).padStart(2, "0");
        var hh = String(now.getHours()).padStart(2, "0");
        var mi = String(now.getMinutes()).padStart(2, "0");
        var ss = String(now.getSeconds()).padStart(2, "0");
        var ms = String(now.getMilliseconds()).padStart(3, "0");
        return "RPT-" + yyyy + mm + dd + "-" + hh + mi + ss + ms;
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
            await loadCategories();
            await resolveReporterId();
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