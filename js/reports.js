document.addEventListener('DOMContentLoaded', function() {
    const modal = new bootstrap.Modal(document.getElementById('modal-report'));
    
    // Tombol Buka Modal
    document.getElementById('btn-add-report').addEventListener('click', () => {
        document.getElementById('form-report').reset();
        modal.show();
    });

    // Simulasi Submit Laporan dengan SweetAlert
    document.getElementById('form-report').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Di sini nanti tempat nembak API temenmu
        Swal.fire({
            text: "Laporan berhasil dikirim! Teknisi akan segera meninjau.",
            icon: "success",
            buttonsStyling: false,
            confirmButtonText: "Sip, Mengerti!",
            customClass: {
                confirmButton: "btn btn-primary"
            }
        }).then(() => {
            modal.hide();
        });
    });
});