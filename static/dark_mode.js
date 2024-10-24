// static/dark_mode.js

document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('dark-mode-toggle');
    const body = document.body;

    // Comprobar si hay una preferencia guardada
    if (localStorage.getItem('darkMode') === 'false') {
        body.classList.remove('dark-mode');
        toggle.checked = false;
    } else {
        body.classList.add('dark-mode');
        toggle.checked = true;
    }

    toggle.addEventListener('change', function() {
        if (toggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    });
});
