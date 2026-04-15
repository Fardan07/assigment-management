document.addEventListener('DOMContentLoaded', function() {
    // Fungsi untuk mengambil data dari API (Nanti diisi temanmu)
    function loadUsers() {
        const tbody = document.querySelector('#user-table tbody');
        
        // Tampilan loading sementara
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-10">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="text-gray-400 mt-2">Menghubungkan ke database...</div>
                </td>
            </tr>
        `;

        // TEMPAT TEMANMU TARUH FETCH API:
        // fetch(APP_CONFIG.apiBaseUrl + '/users')
        //     .then(res => res.json())
        //     .then(data => { ... render data ... });
    }

    loadUsers();

    document.getElementById('btn-add-user').addEventListener('click', () => {
        Swal.fire({
            title: 'Tambah Pengguna',
            text: 'Form ini akan muncul setelah API siap.',
            icon: 'info'
        });
    });
});