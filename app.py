from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import *
from qrcode.image.styles.colormasks import *
import io
import base64
from PIL import Image
import hashlib

app = Flask(__name__)

# Mapas para opciones de corrección de errores
ERROR_CORRECTION_DICT = {
    'L': ERROR_CORRECT_L,
    'M': ERROR_CORRECT_M,
    'Q': ERROR_CORRECT_Q,
    'H': ERROR_CORRECT_H
}

# Opciones de estilos de módulo
MODULE_DRAWERS = {
    'square': SquareModuleDrawer(),
    'circle': CircleModuleDrawer(),
    'gapped_square': GappedSquareModuleDrawer(),
    'rounded': RoundedModuleDrawer(),
    'vertical_bars': VerticalBarsDrawer(),
    'horizontal_bars': HorizontalBarsDrawer()
}

# Opciones de máscaras de color
COLOR_MASKS = {
    'solid': SolidFillColorMask(),
    'gradient': RadialGradiantColorMask(),
    'square_gradient': SquareGradiantColorMask(),
    'horizontal_gradient': HorizontalGradiantColorMask(),
    'vertical_gradient': VerticalGradiantColorMask()
}

# Cache para códigos QR generados
qr_cache = {}

def hex_to_rgb(value):
    value = value.lstrip('#')
    lv = len(value)
    if lv == 6:
        return tuple(int(value[i:i+2], 16) for i in (0, 2, 4))
    elif lv == 3:
        return tuple(int(value[i]*2, 16) for i in range(3))
    else:
        raise ValueError("Formato de color hexadecimal inválido")


def generate_qr_image(form_data, files_data=None, include_embedded_image=False):
    data = form_data.get('data')
    if not data:
        return None, 'No se proporcionó ningún dato'

    try:
        # Crear un hash único de los parámetros para usarlo en el cache
        hash_input = str(sorted(form_data.items()))
        if include_embedded_image and files_data and 'embedded_image' in files_data:
            embedded_image_file = files_data.get('embedded_image')
            if embedded_image_file and embedded_image_file.filename != '':
                embedded_image_content = embedded_image_file.read()
                hash_input += str(hashlib.md5(embedded_image_content).hexdigest())
                # Volver a colocar el puntero al inicio
                embedded_image_file.seek(0)
        hash_key = hashlib.md5(hash_input.encode()).hexdigest()

        # Verificar si el código QR ya está en el cache
        if hash_key in qr_cache:
            return qr_cache[hash_key], None

        version = int(form_data.get('version')) if form_data.get('version') else None
        error_correction = ERROR_CORRECTION_DICT.get(form_data.get('error_correction'), ERROR_CORRECT_M)
        box_size = int(form_data.get('box_size', 10))
        border = int(form_data.get('border', 4))
        fill_color = form_data.get('fill_color', '#000000')
        back_color = form_data.get('back_color', '#FFFFFF')
        module_drawer_name = form_data.get('module_drawer', 'square')
        module_drawer = MODULE_DRAWERS.get(module_drawer_name, SquareModuleDrawer())
        color_mask_name = form_data.get('color_mask', 'solid')

        # Convertir colores hexadecimales a RGB
        fill_color_rgb = hex_to_rgb(fill_color)
        back_color_rgb = hex_to_rgb(back_color)

        qr = qrcode.QRCode(
            version=version,
            error_correction=error_correction,
            box_size=box_size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)

        embedded_image_path = None
        if include_embedded_image and files_data and 'embedded_image' in files_data:
            embedded_image = files_data.get('embedded_image')
            if embedded_image and embedded_image.filename != '':
                embedded_image = Image.open(embedded_image)
                embedded_image = embedded_image.convert("RGBA")
                max_size = (qr.modules_count * box_size // 3, qr.modules_count * box_size // 3)
                embedded_image.thumbnail((int(max_size[0]), int(max_size[1])))
                embedded_image_path = embedded_image

        # Configuración de colores para la máscara de color
        if color_mask_name == 'solid':
            color_mask = SolidFillColorMask(front_color=fill_color_rgb, back_color=back_color_rgb)
        elif color_mask_name == 'gradient':
            color_mask = RadialGradiantColorMask(center_color=fill_color_rgb, edge_color=back_color_rgb)
        elif color_mask_name == 'square_gradient':
            color_mask = SquareGradiantColorMask(center_color=fill_color_rgb, edge_color=back_color_rgb)
        elif color_mask_name == 'horizontal_gradient':
            color_mask = HorizontalGradiantColorMask(left_color=fill_color_rgb, right_color=back_color_rgb)
        elif color_mask_name == 'vertical_gradient':
            color_mask = VerticalGradiantColorMask(top_color=fill_color_rgb, bottom_color=back_color_rgb)
        else:
            # Si la máscara de color no es reconocida, usar 'solid' por defecto
            color_mask = SolidFillColorMask(front_color=fill_color_rgb, back_color=back_color_rgb)

        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=module_drawer,
            color_mask=color_mask,
            embeded_image=embedded_image_path
        ).convert('RGB')

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        qr_image = 'data:image/png;base64,' + img_base64

        # Almacenar en el cache
        qr_cache[hash_key] = qr_image

        return qr_image, None

    except Exception as e:
        return None, str(e)


@app.route('/')
def index():
    return redirect(url_for('qr_generator'))

@app.route('/qr-generator', methods=['GET'])
def qr_generator():
    return render_template(
        'qr_generator.html',
        module_drawers=MODULE_DRAWERS.keys(),
        color_masks=COLOR_MASKS.keys()
    )

@app.route('/generate-qr', methods=['POST'])
def generate_qr():
    include_embedded_image = True  # Asegurarse de que está en True
    qr_image, error = generate_qr_image(request.form, request.files, include_embedded_image=include_embedded_image)
    if qr_image:
        return jsonify({'qr_image': qr_image})
    else:
        return jsonify({'error': error}), 500


@app.route('/download-qr', methods=['POST'])
def download_qr():
    qr_image, error = generate_qr_image(request.form, request.files, include_embedded_image=True)
    if qr_image:
        img_data = base64.b64decode(qr_image.split(',')[1])
        return send_file(
            io.BytesIO(img_data),
            mimetype='image/png',
            as_attachment=True,
            download_name='codigo_qr.png'
        )
    else:
        return jsonify({'error': error}), 500

@app.route('/coming-soon')
def coming_soon():
    return render_template('coming_soon.html')

if __name__ == '__main__':
    app.run(debug=True)
