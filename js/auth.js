/**
 * AuthClient - Authentication client untuk Admin Panel
 *
 * Menangani login, logout, token management, dan authenticated fetch.
 */
class AuthClient {

    /**
     * @param {Object} config
     * @param {string} config.baseUrl - Base URL API
     * @param {string} config.appCode - Application code (wajib)
     */
    constructor(config = {}) {
        if (!config.appCode) {
            throw new Error('AuthClient: appCode wajib diisi. Contoh: new AuthClient({ appCode: "INVENTORY" })');
        }

        this.baseUrl = config.baseUrl || APP_CONFIG.authBaseUrl;
        this.appCode = config.appCode;

        this.STORAGE_KEYS = {
            accessToken: 'auth_access_token',
            refreshToken: 'auth_refresh_token',
            user: 'auth_user'
        };

        this._refreshPromise = null;

        // Idle timeout state
        this._idleTimer = null;
        this._idleTimeoutMs = 0;
        this._isIdle = false;
        this._idleThrottled = false;
        this._boundResetIdle = this._resetIdleTimer.bind(this);
        this._idleEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    }

    // ─── Token Getters ───────────────────────────────────────────────

    getAccessToken() {
        return localStorage.getItem(this.STORAGE_KEYS.accessToken);
    }

    getRefreshToken() {
        return localStorage.getItem(this.STORAGE_KEYS.refreshToken);
    }

    get currentUser() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEYS.user);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    get isAuthenticated() {
        const token = this.getAccessToken();
        if (!token) return false;
        return !this._isTokenExpired(token);
    }

    // ─── Auth Endpoints ──────────────────────────────────────────────

    /**
     * Login dengan username dan password.
     * Menyimpan token dan data user ke localStorage.
     */
    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/session/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_code: this.appCode,
                username,
                password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Login failed');
        }

        const data = result.data || result;
        this._storeTokens(data);

        return this.currentUser;
    }

    /**
     * Register user baru.
     */
    async register(data) {
        const payload = {
            app_code: this.appCode,
            username: data.username,
            email: data.email,
            password: data.password,
            full_name: data.full_name,
            phone: data.phone || ''
        };

        const response = await fetch(`${this.baseUrl}/account/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Registration failed');
        }

        return result.data || result;
    }

    /**
     * Logout user. Membersihkan localStorage terlebih dahulu agar redirect instan,
     * lalu mengirim invalidasi refresh token ke server secara fire-and-forget.
     */
    logout() {
        this.stopIdleTimer();
        const refreshToken = this.getRefreshToken();
        const accessToken = this.getAccessToken();

        // Clear storage dulu agar redirect tidak menunggu server
        this._clearStorage();

        // Fire-and-forget: invalidasi refresh token di server
        if (refreshToken) {
            fetch(`${this.baseUrl}/session/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            }).catch(function () { /* ignore */ });
        }
    }

    /**
     * Refresh access token menggunakan refresh token.
     * Menggunakan singleton promise untuk mencegah concurrent refresh.
     */
    async refresh() {
        // Jangan refresh token jika user sedang idle
        if (this._isIdle) {
            this._clearStorage();
            throw new Error('Session idle — refresh token dibatalkan');
        }

        if (this._refreshPromise) {
            return this._refreshPromise;
        }

        this._refreshPromise = this._doRefresh();

        try {
            const result = await this._refreshPromise;
            return result;
        } finally {
            this._refreshPromise = null;
        }
    }

    async _doRefresh() {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            throw new Error('Refresh token tidak tersedia');
        }

        const response = await fetch(`${this.baseUrl}/session/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        const result = await response.json();

        if (!response.ok) {
            this._clearStorage();
            throw new Error(result.message || 'Token refresh failed');
        }

        const data = result.data || result;
        this._storeTokens(data);

        return data;
    }

    /**
     * Mendapatkan profil user yang sedang login.
     */
    async getMe() {
        const response = await this.fetch(`${this.baseUrl}/me`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch profile data');
        }

        const userData = result.data || result;
        localStorage.setItem(this.STORAGE_KEYS.user, JSON.stringify(userData));

        return userData;
    }

    /**
     * Mengubah password user yang sedang login.
     */
    async changePassword(oldPassword, newPassword) {
        const response = await this.fetch(`${this.baseUrl}/account/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to change password');
        }

        return result.data || result;
    }

    /**
     * Mengirim email reset password.
     */
    async forgotPassword(email) {
        const response = await fetch(`${this.baseUrl}/account/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send password reset email');
        }

        return result.data || result;
    }

    /**
     * Reset password menggunakan token dari email.
     */
    async resetPassword(token, userId, newPassword) {
        const response = await fetch(`${this.baseUrl}/account/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                user_id: userId,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to reset password');
        }

        return result.data || result;
    }

    /**
     * Mengirim ulang email verifikasi.
     */
    async resendVerification(email) {
        const response = await fetch(`${this.baseUrl}/account/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to resend verification email');
        }

        return result.data || result;
    }

    // ─── Role & Permission Check ─────────────────────────────────────

    /**
     * Mengecek apakah user memiliki role tertentu.
     * @param {string} role - Nama role yang dicek
     * @returns {boolean}
     */
    hasRole(role) {
        const user = this.currentUser;
        if (!user) return false;

        // Cek dari array roles
        if (Array.isArray(user.roles)) {
            return user.roles.some(function (r) {
                if (typeof r === 'string') return r === role;
                return r.name === role || r.code === role;
            });
        }

        // Cek dari single role field
        if (user.role) {
            return user.role === role || (user.role.name === role) || (user.role.code === role);
        }

        return false;
    }

    /**
     * Mengecek apakah user memiliki permission tertentu.
     * @param {string} perm - Nama permission yang dicek
     * @returns {boolean}
     */
    hasPermission(perm) {
        const user = this.currentUser;
        if (!user) return false;

        if (Array.isArray(user.permissions)) {
            return user.permissions.some(function (p) {
                if (typeof p === 'string') return p === perm;
                return p.name === perm || p.code === perm;
            });
        }

        return false;
    }

    // ─── Authenticated Fetch ─────────────────────────────────────────

    /**
     * Fetch wrapper yang secara otomatis menambahkan Authorization header.
     * Jika mendapat response 401, akan mencoba refresh token lalu retry.
     * Jika refresh gagal, redirect ke halaman login.
     *
     * @param {string} url - URL endpoint
     * @param {Object} options - fetch options
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        const accessToken = this.getAccessToken();

        if (!options.headers) {
            options.headers = {};
        }

        if (accessToken) {
            options.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // Jangan set Content-Type jika body adalah FormData
        if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }

        let response = await fetch(url, options);

        // Jika 401, coba refresh token dan retry
        if (response.status === 401) {
            try {
                await this.refresh();

                // Retry dengan token baru
                const newToken = this.getAccessToken();
                options.headers['Authorization'] = `Bearer ${newToken}`;

                response = await fetch(url, options);
            } catch {
                // Refresh gagal, redirect ke login
                this._clearStorage();
                window.location.href = 'login.html';
                throw new Error('Session has expired. Please log in again.');
            }
        }

        return response;
    }

    // ─── Idle Timeout ──────────────────────────────────────────────

    /**
     * Mulai idle timer. Jika user tidak ada aktivitas selama timeoutMinutes,
     * session akan dihentikan dan redirect ke login.
     * @param {number} timeoutMinutes - Durasi idle dalam menit
     */
    startIdleTimer(timeoutMinutes) {
        if (!timeoutMinutes || timeoutMinutes <= 0) return;

        this._idleTimeoutMs = timeoutMinutes * 60 * 1000;
        this._isIdle = false;

        // Pasang event listener untuk track aktivitas user
        this._idleEvents.forEach(event => {
            document.addEventListener(event, this._boundResetIdle, { passive: true });
        });

        // Mulai timer pertama kali
        this._startTimer();
    }

    /**
     * Stop idle timer dan hapus semua event listener.
     * Dipanggil saat logout manual.
     */
    stopIdleTimer() {
        clearTimeout(this._idleTimer);
        this._idleTimer = null;

        this._idleEvents.forEach(event => {
            document.removeEventListener(event, this._boundResetIdle);
        });
    }

    /**
     * Reset idle timer — dipanggil setiap ada aktivitas user.
     * Menggunakan throttle 30 detik untuk mousemove dan scroll agar tidak boros.
     * @private
     */
    _resetIdleTimer() {
        if (this._idleThrottled) return;

        this._idleThrottled = true;
        setTimeout(() => { this._idleThrottled = false; }, 30000);

        this._isIdle = false;
        this._startTimer();
    }

    /**
     * Start/restart timeout timer.
     * @private
     */
    _startTimer() {
        clearTimeout(this._idleTimer);
        this._idleTimer = setTimeout(() => this._onIdleTimeout(), this._idleTimeoutMs);
    }

    /**
     * Handler saat idle timeout tercapai.
     * Hapus token dari storage dan redirect ke login page.
     * @private
     */
    _onIdleTimeout() {
        this._isIdle = true;
        this.stopIdleTimer();
        this._clearStorage();
        window.location.href = 'login.html?reason=idle_timeout';
    }

    // ─── Internal Methods ────────────────────────────────────────────

    /**
     * Menyimpan token dan data user ke localStorage.
     * @param {Object} data - Response data dari login/refresh
     */
    _storeTokens(data) {
        if (data.access_token) {
            localStorage.setItem(this.STORAGE_KEYS.accessToken, data.access_token);
        }
        if (data.refresh_token) {
            localStorage.setItem(this.STORAGE_KEYS.refreshToken, data.refresh_token);
        }
        if (data.user) {
            localStorage.setItem(this.STORAGE_KEYS.user, JSON.stringify(data.user));
        }
    }

    /**
     * Menghapus semua data auth dari localStorage.
     */
    _clearStorage() {
        localStorage.removeItem(this.STORAGE_KEYS.accessToken);
        localStorage.removeItem(this.STORAGE_KEYS.refreshToken);
        localStorage.removeItem(this.STORAGE_KEYS.user);
    }

    /**
     * Mengecek apakah JWT token sudah expired.
     * Decode payload dari base64url, lalu bandingkan field exp dengan waktu sekarang.
     *
     * @param {string} token - JWT token
     * @returns {boolean} true jika token sudah expired
     */
    _isTokenExpired(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return true;

            // Decode base64url payload
            let payload = parts[1];
            payload = payload.replace(/-/g, '+').replace(/_/g, '/');

            // Tambahkan padding jika diperlukan
            var padLength = 4 - (payload.length % 4);
            if (padLength < 4) {
                payload += '='.repeat(padLength);
            }

            const decoded = JSON.parse(atob(payload));

            if (!decoded.exp) return false;

            // exp dalam detik, Date.now() dalam milidetik
            // Berikan buffer 30 detik sebelum token benar-benar expired
            var now = Math.floor(Date.now() / 1000);
            return decoded.exp < (now + 30);
        } catch {
            return true;
        }
    }
}

// ─── Global Instance ─────────────────────────────────────────────────
window.AuthClient = AuthClient;
window.auth = new AuthClient({ appCode: APP_CONFIG.appCode });
