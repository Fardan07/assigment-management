(function () {
    function conditionBadge(condition) {
        var c = (condition || "").toLowerCase();
        if (c === "good") return '<span class="badge badge-light-success">Good</span>';
        if (c === "need_repair") return '<span class="badge badge-light-warning">Need Repair</span>';
        if (c === "broken") return '<span class="badge badge-light-danger">Broken</span>';
        if (c === "maintenance") return '<span class="badge badge-light-primary">Maintenance</span>';
        return '<span class="badge badge-light">' + escapeHtml(condition || "-") + '</span>';
    }

    async function fetchTable(endpoint) {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + "/" + endpoint + "/datatables", {
            method: "POST",
            body: JSON.stringify({ draw: 1, start: 0, length: 200 })
        });
        var json = await response.json();
        if (!response.ok) throw new Error(json.message || ("Gagal memuat " + endpoint));
        return json.data || [];
    }

    async function loadFacilities() {
        var facilities = await fetchTable("facility-asset");
        var tbody = document.querySelector("#facility-table tbody");
        if (tbody) {
            if (facilities.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-8">Belum ada data fasilitas.</td></tr>';
            } else {
                tbody.innerHTML = facilities.map(function (f) {
                    var location = [f.floor_level, f.room_name].filter(Boolean).join(" / ");
                    return "<tr>" +
                        "<td class=\"fw-bold\">" + escapeHtml(f.facility_code || "-") + "</td>" +
                        "<td>" + escapeHtml(f.facility_name || "-") + "</td>" +
                        "<td>" + escapeHtml(f.facility_type || "-") + "</td>" +
                        "<td>" + escapeHtml(location || f.location_detail || "-") + "</td>" +
                        "<td>" + conditionBadge(f.condition_status) + "</td>" +
                        "</tr>";
                }).join("");
            }
        }

        var categories = await fetchTable("issue-category");
        var categoryList = document.getElementById("category-list");
        if (categoryList) {
            if (categories.length === 0) {
                categoryList.innerHTML = '<div class="text-gray-500">Belum ada kategori.</div>';
            } else {
                categoryList.innerHTML = categories.map(function (c) {
                    return '<div class="d-flex justify-content-between mb-3">' +
                        '<span class="fw-semibold">' + escapeHtml(c.category_name || "-") + '</span>' +
                        '<span class="badge badge-light-primary">' + escapeHtml(c.category_code || "-") + '</span>' +
                    '</div>';
                }).join("");
            }
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!requireLogin()) return;
        await loadSidebar();
        try {
            await loadFacilities();
        } catch (err) {
            Swal.fire({ icon: "warning", title: "Gagal memuat data", text: err.message || "Terjadi kesalahan." });
        }
    });
})();
