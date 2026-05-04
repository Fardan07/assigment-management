(function () {
    var allFacilities = [];

    function conditionBadge(condition) {
        var c = String(condition || "").toLowerCase();
        if (c === "good") return '<span class="facility-badge condition-good">Good</span>';
        return '<span class="facility-badge condition-bad">' + escapeHtml(condition || "Unknown") + '</span>';
    }

    function renderFacilities(rows) {
        var tbody = document.querySelector("#facility-table tbody");
        if (!tbody) return;

        if (!rows || rows.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" class="text-center py-10"><span class="text-gray-400">Belum ada data fasilitas.</span></td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(function (r) {
            var lokasi = [r.floor_level ? ("Lt. " + r.floor_level) : "", r.room_name || "", r.location_detail || ""]
                .filter(Boolean)
                .join(" / ");

            return "<tr>" +
                "<td class=\"ps-4 fw-bold\">" + escapeHtml(r.facility_code || "-") + "</td>" +
                "<td>" + escapeHtml(r.facility_name || "-") + "</td>" +
                "<td>" + escapeHtml(lokasi || "-") + "</td>" +
                "<td class=\"text-center\">" + conditionBadge(r.condition_status) + "</td>" +
                "<td class=\"text-end pe-4\"><button class=\"btn btn-sm btn-light-primary\">Detail</button></td>" +
                "</tr>";
        }).join("");
    }

    function renderStats(rows) {
        var container = document.getElementById("facility-pie-chart");
        if (!container) return;

        var total = rows.length;
        var good = rows.filter(function (r) { return String(r.condition_status || "").toLowerCase() === "good"; }).length;
        var needRepair = rows.filter(function (r) { return String(r.condition_status || "").toLowerCase() === "need_repair"; }).length;
        var broken = rows.filter(function (r) { return String(r.condition_status || "").toLowerCase() === "broken"; }).length;
        var maintenance = rows.filter(function (r) { return String(r.condition_status || "").toLowerCase() === "maintenance"; }).length;

        container.innerHTML =
            '<div class="d-flex flex-column gap-3">' +
            '<div class="d-flex justify-content-between"><span class="text-gray-600">Total</span><span class="fw-bold">' + total + '</span></div>' +
            '<div class="d-flex justify-content-between"><span class="text-success">Good</span><span class="fw-bold text-success">' + good + '</span></div>' +
            '<div class="d-flex justify-content-between"><span class="text-warning">Need Repair</span><span class="fw-bold text-warning">' + needRepair + '</span></div>' +
            '<div class="d-flex justify-content-between"><span class="text-danger">Broken</span><span class="fw-bold text-danger">' + broken + '</span></div>' +
            '<div class="d-flex justify-content-between"><span class="text-primary">Maintenance</span><span class="fw-bold text-primary">' + maintenance + '</span></div>' +
            '</div>';
    }

    function renderCategories(rows) {
        var categoryList = document.getElementById("category-list");
        if (!categoryList) return;

        if (!rows || rows.length === 0) {
            categoryList.innerHTML = '<div class="text-gray-500">Belum ada kategori.</div>';
            return;
        }

        categoryList.innerHTML = rows.map(function (c) {
            return '<div class="d-flex justify-content-between align-items-center py-2 border-bottom">' +
                '<div class="fw-semibold">' + escapeHtml(c.category_name || "-") + '</div>' +
                '<span class="badge badge-light-primary">' + escapeHtml(c.category_code || "-") + '</span>' +
                '</div>';
        }).join("");
    }

    function applySearch(query) {
        var q = String(query || "").toLowerCase().trim();
        if (!q) {
            renderFacilities(allFacilities);
            return;
        }

        var filtered = allFacilities.filter(function (r) {
            return [
                r.facility_code,
                r.facility_name,
                r.facility_type,
                r.floor_level,
                r.room_name,
                r.location_detail,
                r.condition_status
            ].some(function (v) {
                return String(v || "").toLowerCase().indexOf(q) !== -1;
            });
        });

        renderFacilities(filtered);
    }

    async function fetchDatatables(endpoint) {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/" + endpoint + "/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });

        var json = await response.json();
        if (!response.ok) {
            throw new Error(json.message || ("Gagal mengambil data " + endpoint));
        }
        return json.data || [];
    }

    async function loadFacilitiesPage() {
        var facilities = await fetchDatatables("facility-asset");
        var categories = await fetchDatatables("issue-category");

        allFacilities = facilities;
        renderFacilities(facilities);
        renderStats(facilities);
        renderCategories(categories);
    }

    function bindEvents() {
        var searchInput = document.querySelector('input[placeholder="Cari aset fasilitas..."]');
        if (searchInput) {
            searchInput.addEventListener("input", function (e) {
                applySearch(e.target.value);
            });
        }

        var addBtn = document.getElementById("btn-add-facility");
        if (addBtn) {
            addBtn.addEventListener("click", function () {
                Swal.fire({
                    title: "Tambah Fasilitas",
                    text: "Form create fasilitas bisa kita lanjutkan pada step berikutnya.",
                    icon: "info",
                    confirmButtonText: "OK",
                    buttonsStyling: false,
                    customClass: { confirmButton: "btn btn-primary" }
                });
            });
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!requireLogin()) return;
        await loadSidebar();
        bindEvents();

        try {
            await loadFacilitiesPage();
        } catch (err) {
            Swal.fire({
                title: "Data belum termuat",
                text: err.message || "Terjadi kesalahan saat mengambil data fasilitas.",
                icon: "warning",
                buttonsStyling: false,
                confirmButtonText: "OK",
                customClass: { confirmButton: "btn btn-primary" }
            });
        }
    });
})();