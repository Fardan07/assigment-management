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
                "<td class=\"text-center\">" + (r.barcode ? '<button class="btn btn-sm btn-light-info me-1" onclick="showBarcodeModal(\'' + escapeHtml(r.barcode) + '\', \'' + escapeHtml(r.facility_name) + '\')" title="Tampilkan Barcode"><i class="ki-outline ki-picture fs-4"></i> Scan</button>' : '-') + "</td>" +
                "<td class=\"text-center\">" + conditionBadge(r.condition_status) + "</td>" +
                "<td class=\"text-end pe-4\"><button class=\"btn btn-sm btn-light-primary\" onclick=\"showDetail('"+r.facility_id+"')\">Detail</button></td>" +
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
                var modalEl = document.getElementById('modal_facility_form');
                if(modalEl) {
                    var form = document.getElementById('form_facility');
                    if(form) form.reset();
                    window.currentEditId = null;
                    var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                    modal.show();
                }
            });
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!requireLogin()) return;
        await loadSidebar();

        // Set role badge in header
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
    
    // Global functions for barcode modal
    window.showBarcodeModal = function(barcode, name) {
        document.getElementById('barcode_asset_name').textContent = name;
        JsBarcode("#barcode_canvas", barcode, {
            format: "CODE128",
            width: 1,
            height: 30,
            displayValue: true
        });
        var modalEl = document.getElementById('modal_print_barcode');
        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    };

    window.printBarcode = function() {
        var printContents = document.getElementById('print_barcode_area').innerHTML;
        var printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print Barcode</title>');
        printWindow.document.write('<style>body { text-align: center; margin-top: 50px; font-family: sans-serif; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function() {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    
    window.showDetail = function(id) {
        var asset = allFacilities.find(f => f.facility_id === id);
        if(!asset) return;
        
        window.currentEditId = id;
        document.getElementById('detail_facility_code').textContent = asset.facility_code || '-';
        document.getElementById('detail_facility_name').textContent = asset.facility_name || '-';
        document.getElementById('detail_facility_type').textContent = asset.facility_type || '-';
        document.getElementById('detail_condition_status').innerHTML = conditionBadge(asset.condition_status);
        document.getElementById('detail_location').textContent = [(asset.floor_level ? 'Lt. ' + asset.floor_level : ''), asset.room_name].filter(Boolean).join(' / ') || '-';
        document.getElementById('detail_brand_model').textContent = [(asset.brand || ''), (asset.model || '')].filter(Boolean).join(' - ') || '-';
        document.getElementById('detail_serial_number').textContent = asset.serial_number || '-';
        document.getElementById('detail_barcode').textContent = asset.barcode || '-';
        document.getElementById('detail_notes').textContent = asset.notes || '-';
        
        var modalEl = document.getElementById('modal_facility_detail');
        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    };

    window.saveFacility = async function() {
        var form = document.getElementById('form_facility');
        var formData = new FormData(form);
        var data = Object.fromEntries(formData.entries());
        
        // Jika tambah baru, generate prefix
        if(!window.currentEditId) {
            data.facility_code = 'FAC-' + (data.facility_type === 'AC/Pendingin' ? 'AC' : data.facility_type === 'Elektronik' ? 'EL' : 'XX') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            data.barcode = 'BAR-' + data.facility_code;
        }

        var method = window.currentEditId ? 'PUT' : 'POST';
        var url = APP_CONFIG.apiBaseUrl + '/facility-asset' + (window.currentEditId ? '/' + window.currentEditId : '');
        
        try {
            document.getElementById('btn_save_facility').disabled = true;
            document.getElementById('btn_save_facility').textContent = 'Menyimpan...';

            var response = await window.auth.fetch(url, {
                method: method,
                body: JSON.stringify(data)
            });
            var json = await response.json();
            
            if(!response.ok) throw new Error(json.message || 'Gagal menyimpan fasilitas');
            
            var modalEl = document.getElementById('modal_facility_form');
            var modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            Swal.fire("Berhasil", "Data fasilitas " + (window.currentEditId ? 'diperbarui' : 'ditambahkan'), "success");
            await loadFacilitiesPage();
        } catch(e) {
            Swal.fire("Gagal", e.message, "error");
        } finally {
            document.getElementById('btn_save_facility').disabled = false;
            document.getElementById('btn_save_facility').textContent = 'Simpan';
        }
    };
    
    document.getElementById('btn_edit_trigger')?.addEventListener('click', function() {
        var asset = allFacilities.find(f => f.facility_id === window.currentEditId);
        if(!asset) return;
        var form = document.getElementById('form_facility');
        form.elements['facility_name'].value = asset.facility_name || '';
        form.elements['facility_type'].value = asset.facility_type || '';
        form.elements['floor_level'].value = asset.floor_level || '';
        form.elements['room_name'].value = asset.room_name || '';
        form.elements['brand'].value = asset.brand || '';
        form.elements['model'].value = asset.model || '';
        form.elements['serial_number'].value = asset.serial_number || '';
        form.elements['condition_status'].value = asset.condition_status || 'good';
        form.elements['notes'].value = asset.notes || '';
        
        var modalDetail = bootstrap.Modal.getInstance(document.getElementById('modal_facility_detail'));
        modalDetail.hide();
        var modalForm = new bootstrap.Modal(document.getElementById('modal_facility_form'));
        modalForm.show();
    });

    document.getElementById('btn_delete_trigger')?.addEventListener('click', function() {
        Swal.fire({
            title: "Hapus Aset ini?",
            text: "Data tidak bisa dikembalikan setelah dihapus",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
            customClass: { confirmButton: "btn btn-danger", cancelButton: "btn btn-light" }
        }).then(async function(res) {
            if(res.isConfirmed) {
                try {
                    var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + '/facility-asset/' + window.currentEditId, { method: 'DELETE' });
                    if(!response.ok) throw new Error("Gagal menghapus");
                    
                    var modalDetail = bootstrap.Modal.getInstance(document.getElementById('modal_facility_detail'));
                    modalDetail.hide();
                    
                    Swal.fire("Terhapus!", "Aset telah dihapus.", "success");
                    await loadFacilitiesPage();
                } catch(e) {
                    Swal.fire("Error", e.message, "error");
                }
            }
        });
    });


    window.printAllBarcodes = function() {
        if (!allFacilities || allFacilities.length === 0) {
            Swal.fire("Data kosong", "Tidak ada data aset untuk dicetak barcodenya.", "warning");
            return;
        }
        
        var printContents = '<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">';
        
        var tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        allFacilities.forEach(function(r) {
            if (r.barcode) {
                var svgId = 'temp_svg_' + r.facility_id;
                tempDiv.innerHTML += '<svg id="' + svgId + '"></svg>';
                JsBarcode('#' + svgId, r.barcode, {
                    format: "CODE128",
                    width: 1,
                    height: 30,
                    displayValue: true
                });
                
                var svgEl = document.getElementById(svgId);
                printContents += '<div style="border: 1px solid #ccc; padding: 10px; text-align: center; width: 200px; page-break-inside: avoid; margin-bottom: 20px;">';
                printContents += '<div style="font-weight: bold; margin-bottom: 5px; font-size: 10px;">' + escapeHtml(r.facility_name) + ' (' + escapeHtml(r.facility_code) + ')</div>';
                printContents += '<div style="font-size: 10px; margin-bottom: 10px;">' + escapeHtml(r.room_name || '-') + '</div>';
                printContents += svgEl.outerHTML.replace("<svg ", "<svg style=\"max-width: 100%; height: auto;\" ");
                printContents += '</div>';
            }
        });
        
        printContents += '</div>';
        document.body.removeChild(tempDiv);
        
        var printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Print Semua Barcode</title>');
        printWindow.document.write('<style>body { font-family: sans-serif; padding: 20px; } @media print { body { padding: 0; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2 style="text-align: center; margin-bottom: 30px;">Semua Barcode Aset</h2>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function() {
            printWindow.print();
            printWindow.close();
        }, 1000);
    };

})();