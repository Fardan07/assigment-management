(function () {
    var allRows = [];
    var modal;
    var currentUser;

    function statusBadge(status) {
        var s = String(status || "").toLowerCase();
        if (s === "assigned") return '<span class="badge badge-light-primary">Assigned</span>';
        if (s === "in_progress") return '<span class="badge badge-light-warning">In Progress</span>';
        if (s === "pending_review") return '<span class="badge badge-light-info">Pending Review</span>';
        if (s === "approved") return '<span class="badge badge-light-success">Approved (Selesai)</span>';
        if (s === "rejected") return '<span class="badge badge-light-danger">Rejected</span>';
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
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">Tidak ada pekerjaan yang ditugaskan.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td class=\"fw-bold\">" + escapeHtml(r.report_number || "-") + "</td>" +
                "<td>" + escapeHtml(r.title || "-") + "</td>" +
                "<td>" + escapeHtml(r.category_name || "-") + "</td>" +
                "<td>" + statusBadge(r.status) + "</td>" +
                "<td>" + urgencyBadge(r.urgency) + "</td>" +
                "<td class=\"text-end\"></td>" +
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
                r.category_name,
                r.status,
                r.urgency
            ].some(function (v) {
                return String(v || "").toLowerCase().indexOf(q) !== -1;
            });
        });

        renderTable(filtered);
    }

    async function resolveTechnicianUserId() {
        if (!currentUser) return;
        if (currentUser.user_id) return;

        var identityEmail = String(currentUser.email || "").toLowerCase().trim();
        var identityName = String(currentUser.full_name || currentUser.username || "").toLowerCase().trim();
        var identityEmployee = String(currentUser.employee_code || "").toLowerCase().trim();

        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/app-user/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 500 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || "Gagal sinkronisasi user teknisi");
        }

        var match = (json.data || []).find(function (u) {
            var mail = String(u.email || "").toLowerCase().trim();
            var name = String(u.full_name || "").toLowerCase().trim();
            var employee = String(u.employee_code || "").toLowerCase().trim();
            return (identityEmail && mail === identityEmail) ||
                (identityName && name === identityName) ||
                (identityEmployee && employee === identityEmployee);
        });

        if (match && match.user_id) {
            currentUser.user_id = match.user_id;
            if (window.auth && window.auth.currentUser) {
                window.auth.currentUser.user_id = match.user_id;
                localStorage.setItem(window.auth.STORAGE_KEYS.user, JSON.stringify(window.auth.currentUser));
            }
        }
    }

    async function loadReports() {
        try {
            await resolveTechnicianUserId();
            if (!currentUser) {
                throw new Error("User belum terinisialisasi");
            }

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
                throw new Error(json.message || "Gagal memuat data pekerjaan");
            }

            var currentUserId = String(currentUser.user_id || "").toLowerCase().trim();
            var currentName = String(currentUser.full_name || currentUser.username || "").toLowerCase().trim();

            // Filter for reports assigned to current tech
            allRows = (json.data || []).filter(function (r) {
                var assignedId = String(r.assigned_to_id || "").toLowerCase().trim();
                var assignedName = String(r.assignee_name || "").toLowerCase().trim();
                var idMatched = currentUserId && assignedId === currentUserId;
                var nameMatched = currentName && assignedName && assignedName === currentName;

                var s = String(r.status || "").toLowerCase();
                return (idMatched || nameMatched) && (s === "pending_review" || s === "approved" || s === "solved" || s === "closed");
            });
            renderTable(allRows);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "warning",
                title: "Data belum termuat",
                text: err.message || "Terjadi kesalahan saat mengambil data"
            });
        }
    }

    async function updateReport(reportId, status, technicianNote, photoFile) {
        try {
            var updateData = {
                status: status,
                technician_note: technicianNote
            };

            if (status === "in_progress") {
                updateData.started_at = new Date().toISOString();
            } else if (status === "pending_review") {
                updateData.solved_at = new Date().toISOString();
                if (photoFile) {
                    updateData.photo_after_url = await fileToDataUrl(photoFile);
                }
            }

            updateData.report_id = reportId;

            var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/maintenance-report/update", {
                method: "POST",
                body: JSON.stringify(updateData)
            });

            var json = await response.json();
            if (!response.ok) throw new Error(json.message || "Gagal update report");

            Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Status pekerjaan berhasil diupdate"
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

    function fileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function bindEvents() {
        var searchInput = document.querySelector('[data-kt-report-table-filter="search"]');
        if (searchInput) {
            searchInput.addEventListener("input", function (e) {
                applySearch(e.target.value);
            });
        }

        // Handle file preview
        var photoInput = document.querySelector('input[name="photo_after"]');
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

        document.addEventListener("click", function (e) {
            if (e.target.classList.contains("btn-update")) {
                var reportId = e.target.getAttribute("data-report-id");
                var report = allRows.find(function (r) { return r.report_id === reportId; });
                if (report && modal) {
                    document.querySelector('input[name="report_id"]').value = reportId;
                    document.getElementById("modal-report-title").textContent = report.title;
                    document.getElementById("modal-current-status").textContent = "Status Saat Ini: " + (report.status || "-");
                    
                    var selectStatus = document.querySelector('select[name="status"]');
                    selectStatus.innerHTML = '';
                    var currentStatus = String(report.status || "").toLowerCase();
                    if (currentStatus === 'assigned') {
                        selectStatus.innerHTML = '<option value="in_progress">Mulai Pekerjaan (In Progress)</option>';
                    } else if (currentStatus === 'in_progress') {
                        selectStatus.innerHTML = '<option value="pending_review">Serah untuk Review (Pending Review)</option>';
                    } else {
                        selectStatus.innerHTML = '<option value="">-- Invalid Status --</option>';
                    }
                    
                    modal.show();
                }
            }
        });

        var formUpdate = document.getElementById("form-update");
        if (formUpdate) {
            formUpdate.addEventListener("submit", function (e) {
                e.preventDefault();
                var reportId = document.querySelector('input[name="report_id"]').value;
                var status = document.querySelector('select[name="status"]').value;
                var technicianNote = document.querySelector('textarea[name="technician_note"]').value;
                var photoFile = document.querySelector('input[name="photo_after"]').files[0];

                updateReport(reportId, status, technicianNote, photoFile);
            });
        }
    }

    async function init() {
        if (!requireLogin()) return;
        currentUser = window.auth.currentUser;
        if (!currentUser) {
            // Try to fetch profile
            try {
                currentUser = await window.auth.getMe();
            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Data pengguna tidak tersedia"
                });
                return;
            }
        }

        await loadSidebar();

        // Set role badge in header
        try {
            await syncCurrentUserRole();
            currentUser = window.auth.currentUser;
            var rawRole = resolveCurrentRole(currentUser);
            var roleText = rawRole ? String(rawRole).toUpperCase() : '-';
            var badgeEl = document.getElementById('current-role-badge');
            if (badgeEl) badgeEl.textContent = 'ROLE: ' + roleText;
        } catch (err) {
            console.warn('Failed to set role badge:', err && err.message ? err.message : err);
        }
        currentUser = window.auth.currentUser;

        var modalEl = document.getElementById("modal-update");
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
