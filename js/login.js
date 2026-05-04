document.addEventListener('DOMContentLoaded', function () {
    // Jika sudah authenticated, langsung redirect ke dashboard
    if (window.auth && window.auth.isAuthenticated) {
        window.location.href = 'index.html';
        return;
    }

    var form = document.getElementById('login-form');
    var errorDiv = document.getElementById('login-error');
    var errorMsg = document.getElementById('login-error-msg');
    var btnText = document.getElementById('login-btn-text');
    var btnLoading = document.getElementById('login-btn-loading');
    var submitBtn = document.getElementById('login-submit');

    // Tampilkan pesan jika redirect dari idle timeout
    var params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'idle_timeout') {
        errorDiv.classList.remove('d-none');
        errorDiv.classList.replace('alert-danger', 'alert-primary');
        errorMsg.textContent = 'Session expired due to inactivity. Please sign in again.';
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        var username = document.getElementById('login-username').value.trim();
        var password = document.getElementById('login-password').value;

        // Validasi input
        if (!username || !password) {
            errorDiv.classList.remove('d-none');
            errorMsg.textContent = 'Username and password are required.';
            return;
        }

        // Set loading state
        btnText.classList.add('d-none');
        btnLoading.classList.remove('d-none');
        submitBtn.disabled = true;
        errorDiv.classList.add('d-none');

        try {
            await window.auth.login(username, password);
            window.location.href = 'index.html';
        } catch (err) {
            errorDiv.classList.remove('d-none');
            errorMsg.textContent = err.message || 'Login failed. Please check your username and password.';
        } finally {
            btnText.classList.remove('d-none');
            btnLoading.classList.add('d-none');
            submitBtn.disabled = false;
        }
    });

});
