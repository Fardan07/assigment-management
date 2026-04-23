/**
 * ========================================
 * COMMON UTILITIES
 * Shared functions used across all pages.

 * Include auth.js BEFORE this file.

 * Include this file BEFORE page-specific JS.
 * ========================================
 */


/**
 * ========================================
 * AUTHENTICATION GUARD & HELPERS
 * ========================================
 */

/**
 * Route guard — redirect ke login.html jika belum authenticated.
 * Panggil di awal $(document).ready setiap protected page.
 * @returns {boolean} true jika authenticated, false jika redirect
 */
function requireLogin() {
    if (!window.auth || !window.auth.isAuthenticated) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Route guard — redirect ke index.html jika user tidak memiliki permission tertentu.
 * Panggil setelah requireLogin() di halaman yang membutuhkan permission spesifik.
 * @param {string} permissionName - Nama permission (e.g. 'CATEGORY_READ')
 * @returns {boolean} true jika punya permission, false jika redirect
 */
function requirePermission(permissionName) {
    if (!requireLogin()) return false;

    if (!window.auth.hasPermission(permissionName)) {
        // Sembunyikan konten halaman agar tidak terlihat di belakang dialog
        var contentEl = document.getElementById('kt_app_content');
        if (contentEl) contentEl.style.display = 'none';

        Swal.fire({
            title: 'Access Denied',
            text: 'You do not have permission to access this page.',
            icon: 'error',
            confirmButtonText: 'Back to Dashboard',
            buttonsStyling: false,
            customClass: {
                confirmButton: 'btn fw-bold btn-primary'
            },
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(function () {
            window.location.href = 'index.html';
        });
        return false;
    }
    return true;
}

function normalizeWorkflowRole(role) {
    var r = String(role || '').toUpperCase().trim();
    if (r === 'USER') return 'REQUESTER';
    if (r === 'ADMIN') return 'WO_MANAGER';
    if (r === 'TEKNISI') return 'TECHNICIAN';
    return r;
}

function guessRoleFromIdentity(user) {
    if (!user) return '';

    var raw = [user.username, user.email, user.full_name, user.employee_code]
        .filter(function (v) { return !!v; })
        .join(' ')
        .toLowerCase();

    if (!raw) return '';
    if (raw.indexOf('requester') !== -1 || raw.indexOf('pelapor') !== -1) return 'REQUESTER';
    if (raw.indexOf('wo_manager') !== -1 || raw.indexOf('wo manager') !== -1 || raw.indexOf('wom') !== -1) return 'WO_MANAGER';
    if (raw.indexOf('technician') !== -1 || raw.indexOf('teknisi') !== -1) return 'TECHNICIAN';
    if (raw.indexOf('site_manager') !== -1 || raw.indexOf('site manager') !== -1 || raw.indexOf('sitemanager') !== -1) return 'SITE_MANAGER';

    return '';
}

function resolveCurrentRole(user) {
    if (!user) return '';

    if (typeof user.role === 'string') {
        return normalizeWorkflowRole(user.role);
    }

    if (user.role && (user.role.code || user.role.name)) {
        return normalizeWorkflowRole(user.role.code || user.role.name);
    }

    if (Array.isArray(user.roles) && user.roles.length > 0) {
        var firstRole = user.roles[0];
        return normalizeWorkflowRole((firstRole && (firstRole.code || firstRole.name)) || firstRole || '');
    }

    return guessRoleFromIdentity(user);
}

/**
 * Sembunyikan menu sidebar yang tidak sesuai permission user.
 * Menu dengan attribute data-permission akan di-hide jika user tidak memiliki permission tersebut.
 * Menu tanpa attribute data-permission selalu ditampilkan (e.g. Dashboard).
 */
function applySidebarPermissions() {
    var user = window.auth ? window.auth.currentUser : null;
    var currentRole = resolveCurrentRole(user);

    document.querySelectorAll('.menu-item[data-permission]').forEach(function (el) {
        if (!checkPermission(el.getAttribute('data-permission'))) {
            el.style.display = 'none';
        }
    });

    document.querySelectorAll('.menu-item[data-roles]').forEach(function (el) {
        var allowed = String(el.getAttribute('data-roles') || '')
            .split(',')
            .map(function (item) { return item.trim().toUpperCase(); })
            .filter(function (item) { return item.length > 0; });

        if (allowed.length === 0) return;

        // Fail-safe: jika role belum terbaca, jangan hide seluruh sidebar.
        if (currentRole && allowed.indexOf(currentRole) === -1) {
            el.style.display = 'none';
        }
    });
}

/**
 * Cek permission user. Return false jika auth belum tersedia.
 * @param {string} permissionName - Nama permission (e.g. 'CATEGORY_CREATE')
 * @returns {boolean}
 */
function checkPermission(permissionName) {
    if (!window.auth) return false;
    return window.auth.hasPermission(permissionName);
}

/**
 * Sinkronkan role user login dari tabel app_user berdasarkan email/username.
 * Ini dipakai agar akun auth service tetap bisa dipetakan ke role workflow lokal.
 */
async function syncCurrentUserRole() {
    if (!window.auth || !window.auth.currentUser) return null;

    var currentUser = window.auth.currentUser;
    var identity = String(currentUser.email || currentUser.username || currentUser.full_name || '').toLowerCase().trim();
    if (!identity) return currentUser;

    try {
        var response = await window.auth.fetch(APP_CONFIG.apiBaseUrl + '/app-user/datatables', {
            method: 'POST',
            body: JSON.stringify({ draw: 1, start: 0, length: 500 })
        });

        var json = await response.json();
        if (!response.ok) return currentUser;

        var match = (json.data || []).find(function (user) {
            return String(user.email || '').toLowerCase() === identity ||
                String(user.employee_code || '').toLowerCase() === identity ||
                String(user.full_name || '').toLowerCase() === identity;
        });

        if (match) {
            currentUser.user_id = match.user_id || currentUser.user_id;
            currentUser.role = normalizeWorkflowRole(match.role);
            currentUser.employee_code = match.employee_code || currentUser.employee_code;
            currentUser.full_name = match.full_name || currentUser.full_name;
            currentUser.department = match.department || currentUser.department;
            currentUser.job_title = match.job_title || currentUser.job_title;
            localStorage.setItem(window.auth.STORAGE_KEYS.user, JSON.stringify(currentUser));
        } else {
            // Fallback sederhana jika tidak ada kecocokan di app_user
            var guessedRole = resolveCurrentRole(currentUser);
            if (guessedRole) {
                currentUser.role = guessedRole;
                localStorage.setItem(window.auth.STORAGE_KEYS.user, JSON.stringify(currentUser));
            }
        }
    } catch (err) {
        console.warn('Role sync skipped:', err.message || err);
    }

    return currentUser;
}


/**
 * Load sidebar secara dinamis dari file sidebar.html.
 * Fetch konten, inject ke #kt_app_sidebar, set menu active berdasarkan halaman saat ini.

 * Setelah load, jalankan applySidebarPermissions() dan renderUserInfo().

 * @returns {Promise}
 */
function loadSidebar() {
    var sidebarEl = document.getElementById('kt_app_sidebar');
    if (!sidebarEl) return Promise.resolve();

    return syncCurrentUserRole().then(function () {
        return fetch('sidebar.html?v=20260417c');
    })
        .then(function (response) { return response.text(); })
        .then(function (html) {
            sidebarEl.innerHTML = html;

            // Set active menu berdasarkan halaman saat ini
            var currentPath = window.location.pathname || '/';
            var currentPage = window.location.pathname.split('/').pop() || 'index.html';
            var segments = currentPath.split('/').filter(function (s) { return s; });
            if (!currentPage || currentPage === 'index.html') {
                if (segments.length > 0) {
                    var lastSegment = segments[segments.length - 1].toLowerCase();
                    if (lastSegment === 'reports') currentPage = 'reports.html';
                    if (lastSegment === 'login') currentPage = 'login.html';
                    if (lastSegment === 'workflow-technician') currentPage = 'workflow-technician.html';
                    if (lastSegment === 'workflow-wo-manager') currentPage = 'workflow-wo-manager.html';
                    if (lastSegment === 'workflow-site-manager') currentPage = 'workflow-site-manager.html';
                }
            }
            sidebarEl.querySelectorAll('.menu-link').forEach(function (link) {
                var href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                }
            });


            // Apply permission & render user info
            applySidebarPermissions();
            renderUserInfo();

            var currentUser = window.auth ? window.auth.currentUser : null;
            var currentRole = resolveCurrentRole(currentUser);

            if (currentRole) {
                document.body.setAttribute('data-current-role', currentRole);
            }


            // Re-init scroll components pada sidebar
            if (typeof KTScroll !== 'undefined') {
                KTScroll.createInstances();
            }
        });
}


/**
 * Render user info (inisial avatar, nama, role, tombol logout) di sidebar footer.
 * Mengisi container #sidebar-user-info secara dinamis.
 */
function renderUserInfo() {
    var user = window.auth ? window.auth.currentUser : null;
    if (!user) return;

    var fullName = user.full_name || user.username || 'User';
    var initials = fullName.split(' ')
        .map(function (n) { return n.charAt(0).toUpperCase(); })
        .slice(0, 2)
        .join('');

    // Ambil role pertama untuk display
    var roleDisplay = resolveCurrentRole(user);

    var html = '' +
        '<div class="d-flex align-items-center">' +
            '<div class="symbol symbol-35px symbol-circle me-3">' +
                '<span class="symbol-label bg-primary text-inverse-primary fw-bold fs-7">' + escapeHtml(initials) + '</span>' +
            '</div>' +
            '<div class="d-flex flex-column flex-grow-1 overflow-hidden me-3">' +
                '<span class="text-gray-200 fw-bold fs-7 text-truncate">' + escapeHtml(fullName) + '</span>' +
                (roleDisplay ? '<span class="text-gray-600 fs-8 text-truncate">' + escapeHtml(roleDisplay) + '</span>' : '') +
            '</div>' +
            '<a href="#" id="btn-logout" class="btn btn-sm btn-icon btn-active-color-danger" title="Logout">' +
                '<i class="ki-outline ki-exit-right fs-3 text-gray-600"></i>' +
            '</a>' +
        '</div>';

    var container = document.getElementById('sidebar-user-info');
    if (container) {
        container.innerHTML = html;

        // Bind logout handler
        var logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                handleLogout();
            });
        }
    }
}

/**
 * Handle logout: konfirmasi via SweetAlert lalu auth.logout() dan redirect.
 */
function handleLogout() {
    Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        buttonsStyling: false,
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel',
        customClass: {
            confirmButton: 'btn fw-bold btn-primary',
            cancelButton: 'btn fw-bold btn-active-light-primary'
        }
    }).then(function (result) {
        if (!result.isConfirmed) return;

        if (window.auth) {
            window.auth.logout();
        }
        window.location.href = 'login.html';
    });
}


/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/**
 * Debounce — delays execution until after `wait` ms of inactivity
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * ========================================
 * NUMBER FORMAT CONFIGURATION
 * ========================================
 * Configured via appConfig.numberFormat in payload.
 * locale: 'en-US' → 1,250,456.99 | 'id-ID' → 1.250.456,99
 */

var NUMBER_LOCALE = 'en-US';
var CURRENCY_PREFIX = 'Rp ';
var THOUSAND_SEP = NUMBER_LOCALE === 'id-ID' ? '.' : ',';
var DECIMAL_SEP = NUMBER_LOCALE === 'id-ID' ? ',' : '.';

/**
 * Format number as currency string with configurable prefix and locale.
 * @param {number} number - The number to format
 * @param {number} [dp=0] - Decimal places
 */
function formatCurrency(number, dp) {
    if (number === null || number === undefined || number === '') return '';
    dp = dp !== undefined ? dp : 0;
    return CURRENCY_PREFIX + new Intl.NumberFormat(NUMBER_LOCALE, {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp
    }).format(number);
}

/**
 * Format number with digit separators using configured locale.
 * @param {number} number - The number to format
 * @param {number} [dp=0] - Decimal places
 */
function formatNumber(number, dp) {
    if (!number && number !== 0) return '';
    dp = dp !== undefined ? dp : 0;
    return new Intl.NumberFormat(NUMBER_LOCALE, {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp
    }).format(number);
}

/**
 * Parse formatted number string back to float.
 * Locale-aware: strips thousand separators and converts decimal separator.
 */
function parseNumber(str) {
    if (!str) return 0;
    str = String(str).replace(CURRENCY_PREFIX, '').trim();
    // Remove thousand separators, convert decimal separator to dot
    var re = new RegExp('\\' + THOUSAND_SEP, 'g');
    str = str.replace(re, '');
    if (DECIMAL_SEP !== '.') str = str.replace(DECIMAL_SEP, '.');
    return parseFloat(str) || 0;
}

/**
 * ========================================
 * UI FUNCTIONS
 * ========================================
 */

/**
 * Show/hide the full-page loading overlay
 */
function showLoading(show) {
    if (show) {
        $('#loading-overlay').removeClass('d-none');
    } else {
        $('#loading-overlay').addClass('d-none');
    }
}

/**
 * Show a toastr notification
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Notification title
 * @param {string} message - Notification body text
 */
function showNotification(type, title, message) {
    toastr.options = {
        "closeButton": false,
        "debug": false,
        "newestOnTop": false,
        "progressBar": false,
        "positionClass": "toastr-top-right",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "3000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };

    var fn = toastr[type] || toastr.info;
    fn(message || '', title);
}

/**
 * ========================================
 * FORM VALIDATION HELPERS
 * ========================================
 */

/**
 * Show validation error on a specific field
 */
function showFieldError(fieldId, message) {
    $(`#${fieldId}`).addClass('is-invalid');
    $(`#${fieldId}-error`).text(message).show();
}

/**
 * Clear validation error from a specific field
 */
function clearFieldError(fieldId) {
    $(`#${fieldId}`).removeClass('is-invalid');
    $(`#${fieldId}-error`).text('').hide();
}

/**
 * Clear all validation errors on the page
 */
function clearAllErrors() {
    $('.form-control, .form-select').removeClass('is-invalid');
    $('.invalid-feedback').text('').hide();
}

/**
 * ========================================

 * AJAX AUTHENTICATION SETUP
 * Auto-attach Bearer token & handle 401.

 * ========================================
 */
$(document).ready(function () {

    // Auto-attach Authorization header ke semua jQuery AJAX requests
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (window.auth && window.auth.getAccessToken()) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + window.auth.getAccessToken());
            }

        }
    });

    // Global handler untuk 401 Unauthorized — redirect ke login
    $(document).ajaxError(function (event, xhr) {
        if (xhr.status === 401) {
            if (window.auth) {
                window.auth.logout();
            }
            window.location.href = 'login.html';
        }
    });



    // Load sidebar secara dinamis dari file terpisah
    loadSidebar().then(function () {
        document.dispatchEvent(new Event('sidebar:loaded'));
    });


    // Inisialisasi idle timeout jika dikonfigurasi
    if (window.auth && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.idleTimeoutMinutes > 0) {
        window.auth.startIdleTimer(APP_CONFIG.idleTimeoutMinutes);
    }

});
