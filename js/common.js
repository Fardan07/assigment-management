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

/**
 * Sembunyikan menu sidebar yang tidak sesuai permission user.
 * Menu dengan attribute data-permission akan di-hide jika user tidak memiliki permission tersebut.
 * Menu tanpa attribute data-permission selalu ditampilkan (e.g. Dashboard).
 */
function applySidebarPermissions() {
    document.querySelectorAll('.menu-item[data-permission]').forEach(function (el) {
        if (!checkPermission(el.getAttribute('data-permission'))) {
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
 * Load sidebar secara dinamis dari file sidebar.html.
 * Fetch konten, inject ke #kt_app_sidebar, set menu active berdasarkan halaman saat ini.

 * Setelah load, jalankan applySidebarPermissions() dan renderUserInfo().

 * @returns {Promise}
 */
function loadSidebar() {
    var sidebarEl = document.getElementById('kt_app_sidebar');
    if (!sidebarEl) return Promise.resolve();

    return fetch('sidebar.html')
        .then(function (response) { return response.text(); })
        .then(function (html) {
            sidebarEl.innerHTML = html;

            // Set active menu berdasarkan halaman saat ini
            var currentPage = window.location.pathname.split('/').pop() || 'index.html';
            sidebarEl.querySelectorAll('.menu-link').forEach(function (link) {
                var href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                }
            });


            // Apply permission & render user info
            applySidebarPermissions();
            renderUserInfo();


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
    var roleDisplay = '';
    if (Array.isArray(user.roles) && user.roles.length > 0) {
        var r = user.roles[0];
        roleDisplay = typeof r === 'string' ? r : (r.name || r.code || '');
    }

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
