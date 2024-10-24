// static/script.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('qr-form');
    const preview = document.getElementById('qr-preview');
    const loadingIndicator = document.getElementById('loading-indicator');

    const embeddedImageInput = document.getElementById('embedded_image');
    const errorCorrectionSelect = document.getElementById('error_correction');
    const errorCorrectionInfo = document.getElementById('error-correction-info');

    const moduleDrawerSelect = document.getElementById('module_drawer');
    const moduleStyleInfo = document.getElementById('module-style-info');

    const fillColorInput = document.getElementById('fill_color');
    const backColorInput = document.getElementById('back_color');
    const contrastInfo = document.getElementById('contrast-info');

    function updateQRPreview() {
        const formData = new FormData();

        // Obtener todos los campos del formulario, incluyendo el archivo
        const formElements = form.elements;
        for (let i = 0; i < formElements.length; i++) {
            const field = formElements[i];
            if (field.name) {
                if (field.type === 'file') {
                    // Si el campo es un archivo, añadir el archivo seleccionado
                    if (field.files.length > 0) {
                        formData.append(field.name, field.files[0]);
                    }
                } else {
                    formData.append(field.name, field.value);
                }
            }
        }

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

    function adjustErrorCorrectionForEmbeddedImage() {
        if (embeddedImageInput.files.length > 0) {
            // Ajustar el nivel de corrección de error a 'H'
            errorCorrectionSelect.value = 'H';
            // Mostrar mensaje al usuario
            errorCorrectionInfo.textContent = 'Se ha ajustado la corrección de error a H debido a la imagen incrustada.';
        } else {
            // Restablecer el mensaje y el nivel de corrección de error
            errorCorrectionInfo.textContent = '';
            errorCorrectionSelect.value = 'M'; // O el valor que prefieras por defecto
        }
        updateQRPreview();
    }

    function adjustParametersForModuleStyle() {
        const selectedStyle = moduleDrawerSelect.value;
        if (selectedStyle === 'rounded' || selectedStyle === 'horizontal_bars') {
            errorCorrectionSelect.value = 'H';
            moduleStyleInfo.textContent = 'El nivel de corrección de error se ha ajustado a H debido al estilo de módulo seleccionado.';
            // Ajustar tamaño de caja y borde si es necesario
            const boxSizeInput = document.getElementById('box_size');
            const borderInput = document.getElementById('border');
            if (parseInt(boxSizeInput.value) < 10) {
                boxSizeInput.value = 10;
            }
            if (parseInt(borderInput.value) < 4) {
                borderInput.value = 4;
            }
        } else {
            moduleStyleInfo.textContent = '';
        }
        updateQRPreview();
    }

    function getLuminance(hexColor) {
        const rgb = hexToRgb(hexColor);
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance;
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        let bigint = parseInt(hex, 16);
        let r, g, b;
        if (hex.length === 6) {
            r = (bigint >> 16) & 255;
            g = (bigint >> 8) & 255;
            b = bigint & 255;
        } else if (hex.length === 3) {
            r = (bigint >> 8) & 15; r *= 17;
            g = (bigint >> 4) & 15; g *= 17;
            b = bigint & 15; b *= 17;
        } else {
            return null;
        }
        return { r, g, b };
    }

    function checkColorContrast() {
        const fillColor = fillColorInput.value;
        const backColor = backColorInput.value;
        const fillLuminance = getLuminance(fillColor);
        const backLuminance = getLuminance(backColor);
        const contrastRatio = Math.abs(fillLuminance - backLuminance);

        if (contrastRatio < 0.5) {
            contrastInfo.textContent = 'El contraste entre el color de relleno y el de fondo es bajo. Esto puede afectar la legibilidad del código QR.';
        } else {
            contrastInfo.textContent = '';
        }
        updateQRPreview();
    }

    // Event listeners
    embeddedImageInput.addEventListener('change', function() {
        adjustErrorCorrectionForEmbeddedImage();
    });

    moduleDrawerSelect.addEventListener('change', function() {
        adjustParametersForModuleStyle();
    });

    fillColorInput.addEventListener('change', checkColorContrast);
    backColorInput.addEventListener('change', checkColorContrast);

    // Actualizar previsualización al cargar la página
    updateQRPreview();

    // Añadir event listeners a los campos del formulario
    form.addEventListener('input', function(e) {
        if (e.target !== embeddedImageInput && e.target !== moduleDrawerSelect && e.target !== fillColorInput && e.target !== backColorInput) {
            updateQRPreview();
        }
    });
    form.addEventListener('change', function(e) {
        if (e.target !== embeddedImageInput && e.target !== moduleDrawerSelect && e.target !== fillColorInput && e.target !== backColorInput) {
            updateQRPreview();
        }
    });

    // Manejar la descarga del QR sin recargar la página
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevenir el envío por defecto
        const formData = new FormData(form);

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
