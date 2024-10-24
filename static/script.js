// static/script.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('qr-form');
    const preview = document.getElementById('qr-preview');
    const loadingIndicator = document.getElementById('loading-indicator');

    function updateQRPreview() {
        const formData = new FormData(form);
        // Excluir el archivo de imagen incrustada para evitar problemas en la previsualización
        formData.delete('embedded_image');

        // Mostrar indicador de carga
        loadingIndicator.style.display = 'block';

        fetch('/generate-qr', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            loadingIndicator.style.display = 'none';
            if (data.qr_image) {
                preview.innerHTML = `<img src="${data.qr_image}" alt="Código QR">`;
            } else if (data.error) {
                preview.innerHTML = `<p>Error: ${data.error}</p>`;
            }
        })
        .catch(error => {
            loadingIndicator.style.display = 'none';
            console.error('Error:', error);
        });
    }

    // Actualizar previsualización al cargar la página
    updateQRPreview();

    // Añadir event listeners a los campos del formulario
    form.addEventListener('input', updateQRPreview);
    form.addEventListener('change', updateQRPreview);

    // Manejar la descarga del QR sin recargar la página
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevenir el envío por defecto
        const formData = new FormData(form);
        formData.append('include_embedded_image', '1');

        // Mostrar indicador de carga
        loadingIndicator.style.display = 'block';

        fetch('/download-qr', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            loadingIndicator.style.display = 'none';
            if (response.ok) {
                return response.blob();
            } else {
                return response.json().then(data => {
                    throw new Error(data.error);
                });
            }
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'codigo_qr.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            loadingIndicator.style.display = 'none';
            alert('Error al descargar el QR: ' + error.message);
        });
    });
});
