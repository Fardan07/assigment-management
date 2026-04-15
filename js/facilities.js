document.addEventListener('DOMContentLoaded', function() {
    function loadFacilities() {
        const tbody = document.querySelector('#facility-table tbody');
        
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-10">
                    <span class="text-gray-400 italic">Menunggu sinkronisasi data fasilitas...</span>
                </td>
            </tr>
        `;
    }

    loadFacilities();

    document.getElementById('btn-add-facility').addEventListener('click', () => {
        Swal.fire({
            title: 'Tambah Fasilitas',
            icon: 'question'
        });
    });
});