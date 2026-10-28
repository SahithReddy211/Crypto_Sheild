import io
import math
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None

class DocumentRenderer:
    """
    Server-side document rasterization and dynamic watermarking engine.
    Ensures that the original PDF is NEVER delivered to the client.
    Only individual rasterized page images (PNG) with burned-in dynamic watermarks are returned.
    """

    @classmethod
    def get_document_info(cls, document_bytes, original_filename=""):
        """
        Determines the total number of pages in the document.
        Supports PDF files via pypdfium2 and plain text documents via pagination.
        """
        is_pdf = document_bytes.startswith(b'%PDF') or (original_filename and original_filename.lower().endswith('.pdf'))
        
        if is_pdf and pdfium is not None:
            try:
                doc = pdfium.PdfDocument(document_bytes)
                return {
                    'is_pdf': True,
                    'total_pages': len(doc),
                    'error': None
                }
            except Exception as e:
                return {
                    'is_pdf': True,
                    'total_pages': 1,
                    'error': str(e)
                }
        else:
            # Plain text document
            try:
                text = document_bytes.decode('utf-8', errors='replace')
            except Exception:
                text = str(document_bytes)
            lines = text.splitlines()
            lines_per_page = 45
            total_pages = max(1, math.ceil(len(lines) / lines_per_page))
            return {
                'is_pdf': False,
                'total_pages': total_pages,
                'error': None
            }

    @classmethod
    def render_page(cls, document_bytes, page_number, watermark_data, original_filename="", scale=2.0):
        """
        Renders a single page (1-indexed) into PNG bytes with server-side dynamic watermarking.
        
        watermark_data format:
        {
            'student_id': 'STU-001',
            'student_name': 'Alex Mercer',
            'exam_name': 'CS-804 Midterm',
            'timestamp': '2026-10-01 13:45 IST'
        }
        """
        info = cls.get_document_info(document_bytes, original_filename)
        total_pages = info['total_pages']
        
        if page_number < 1 or page_number > total_pages:
            raise ValueError(f"Page number {page_number} is out of bounds (1 to {total_pages}).")

        if info['is_pdf'] and pdfium is not None:
            try:
                doc = pdfium.PdfDocument(document_bytes)
                page = doc.get_page(page_number - 1)
                # Render to PIL Image at 2x scale for sharp readability
                pil_image = page.render(scale=scale).to_pil().convert('RGBA')
            except Exception as e:
                # Fallback to text rendering of error
                pil_image = cls._render_text_page(
                    f"Error rendering PDF page {page_number}: {str(e)}", 
                    page_number, 
                    total_pages
                )
        else:
            text = document_bytes.decode('utf-8', errors='replace')
            lines = text.splitlines()
            lines_per_page = 45
            start_idx = (page_number - 1) * lines_per_page
            page_lines = lines[start_idx : start_idx + lines_per_page]
            pil_image = cls._render_text_page(
                "\n".join(page_lines), 
                page_number, 
                total_pages,
                title=original_filename or "Question Paper"
            )

        # Apply Server-Side Dynamic Watermark directly into image pixels
        watermarked_image = cls._apply_watermark(pil_image, watermark_data, page_number, total_pages)

        # Convert to RGB and export to PNG bytes
        rgb_image = watermarked_image.convert('RGB')
        output_buffer = io.BytesIO()
        rgb_image.save(output_buffer, format='PNG', optimize=True)
        png_bytes = output_buffer.getvalue()

        return png_bytes, total_pages

    @classmethod
    def _render_text_page(cls, text_content, page_number, total_pages, title="Question Paper"):
        """Renders plain text onto a standardized high-resolution page canvas"""
        width, height = 1224, 1584  # Standard US Letter @ ~150 DPI
        image = Image.new('RGBA', (width, height), (255, 255, 255, 255))
        draw = ImageDraw.Draw(image)
        font = ImageFont.load_default()

        # Header
        draw.rectangle([(0, 0), (width, 60)], fill=(241, 245, 249, 255))
        draw.text((40, 22), title.upper(), fill=(15, 23, 42, 255), font=font)
        draw.text((width - 150, 22), f"Page {page_number} of {total_pages}", fill=(71, 85, 105, 255), font=font)
        draw.line([(0, 60), (width, 60)], fill=(203, 213, 225, 255), width=2)

        # Content lines
        y = 90
        for line in text_content.splitlines():
            draw.text((50, y), line, fill=(30, 41, 59, 255), font=font)
            y += 24
            if y > height - 80:
                break

        # Footer
        draw.line([(0, height - 50), (width, height - 50)], fill=(226, 232, 240, 255), width=1)
        draw.text((50, height - 35), "CONFIDENTIAL - AUTHORIZED EXAMINATION ACCESS ONLY", fill=(148, 163, 184, 255), font=font)

        return image

    @classmethod
    def _apply_watermark(cls, base_image, wm_data, page_number, total_pages):
        """
        Bakes repeating rotated diagonal watermark text and security banners directly into image raster.
        Cannot be inspected, unhidden, or removed via browser CSS/DOM.
        """
        width, height = base_image.size
        overlay = Image.new('RGBA', (width, height), (255, 255, 255, 0))
        font = ImageFont.load_default()

        student_name = wm_data.get('student_name', 'AUTHORIZED STUDENT')
        student_id = wm_data.get('student_id', '')
        exam_name = wm_data.get('exam_name', 'EXAMINATION')
        timestamp = wm_data.get('timestamp') or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')

        # 1. Create a rotated stamp tile
        stamp_w, stamp_h = 550, 130
        stamp = Image.new('RGBA', (stamp_w, stamp_h), (255, 255, 255, 0))
        sdraw = ImageDraw.Draw(stamp)
        
        # Diagonal repeating watermark strings
        sdraw.text((10, 10), f"CONFIDENTIAL • {student_name}", fill=(220, 38, 38, 48), font=font)
        sdraw.text((10, 30), f"ID: {student_id} • {exam_name}", fill=(100, 116, 139, 42), font=font)
        sdraw.text((10, 50), f"{timestamp} • DO NOT DISTRIBUTE", fill=(220, 38, 38, 38), font=font)

        # Rotate stamp 25 degrees
        rotated_stamp = stamp.rotate(25, expand=True, resample=Image.Resampling.BICUBIC)
        rw, rh = rotated_stamp.size

        # Tile across page
        step_x = rw + 80
        step_y = rh + 80
        for y in range(-50, height + rh, step_y):
            for x in range(-50, width + rw, step_x):
                overlay.paste(rotated_stamp, (x, y), rotated_stamp)

        odraw = ImageDraw.Draw(overlay)

        # 2. Top Security Banner
        odraw.rectangle([(0, 0), (width, 24)], fill=(15, 23, 42, 235))
        odraw.text((15, 6), f"CRYPTO-SHIELD SECURE PAPER VIEWER • {exam_name} • SESSION: {student_id} ({student_name})", fill=(241, 245, 249, 240), font=font)
        odraw.text((width - 140, 6), f"PAGE {page_number} OF {total_pages}", fill=(148, 163, 184, 240), font=font)

        # 3. Bottom Security Verification Banner
        odraw.rectangle([(0, height - 24), (width, height)], fill=(15, 23, 42, 235))
        odraw.text((15, height - 18), f"DIGITALLY SIGNED & WATERMARKED • {timestamp} • ALL ACCESS LOGGED & AUDITED", fill=(148, 163, 184, 240), font=font)

        # Alpha composite overlay over base image
        result = Image.alpha_composite(base_image, overlay)
        return result

document_renderer = DocumentRenderer()
