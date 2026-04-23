/**
 * ========================================
 * APPLICATION CONFIGURATION
 * ========================================
 *
 * File konfigurasi terpusat untuk seluruh aplikasi.
 * Ubah nilai di bawah ini sesuai environment (development, staging, production).
 *

 * File ini HARUS di-load sebelum auth.js dan modul lainnya.

 */
const APP_CONFIG = {

    // Application code — digunakan oleh AuthClient untuk identifikasi aplikasi
    appCode: 'K5BK0H3ATT',

    // Base URL untuk authentication API
    authBaseUrl: 'https://restforge.dev/api/auth',

    // Base URL untuk data/business API
    apiBaseUrl: 'http://localhost:3032/api/facility-helpdesk',

    // Idle timeout dalam menit — logout otomatis jika user tidak aktif (0 = nonaktif)
    idleTimeoutMinutes: 30,

};
