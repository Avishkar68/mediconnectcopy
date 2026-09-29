import io
import os
import re
from typing import Dict, Any
from pypdf import PdfReader
from PIL import Image

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


def extract_document_text(content: bytes | str, file_name: str = "report.txt", mime_type: str = "text/plain") -> Dict[str, Any]:
    """
    Extracts complete text from plain text, PDF, or image files.
    Preserves multi-page headers and page structure.
    """
    if isinstance(content, str):
        return {
            "text": content,
            "pageCount": 1,
            "extractionStatus": "success",
            "extractionNotes": "Direct plain text payload provided."
        }

    ext = os.path.splitext(file_name)[1].lower()

    # 1. PDF Extraction
    if ext == ".pdf" or "pdf" in mime_type.lower():
        try:
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            page_count = len(reader.pages)
            extracted_pages = []

            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                extracted_pages.append(f"--- PAGE {idx + 1} OF {page_count} ---\n{page_text}")

            full_text = "\n\n".join(extracted_pages).strip()

            if full_text and len(full_text) > 20:
                return {
                    "text": full_text,
                    "pageCount": page_count,
                    "extractionStatus": "success",
                    "extractionNotes": f"Extracted text from {page_count} page(s) via PyPDF."
                }
        except Exception as err:
            print(f"PDF text extraction error: {err}")

    # 2. Image / Scanned Document OCR Extraction
    if ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"] or "image" in mime_type.lower():
        if HAS_TESSERACT:
            try:
                img = Image.open(io.BytesIO(content))
                ocr_text = pytesseract.image_to_string(img)
                if ocr_text and len(ocr_text.strip()) > 10:
                    return {
                        "text": ocr_text.strip(),
                        "pageCount": 1,
                        "extractionStatus": "success",
                        "extractionNotes": "Extracted text via Tesseract OCR."
                    }
            except Exception as ocr_err:
                print(f"OCR processing failed: {ocr_err}")
                return {
                    "text": "",
                    "pageCount": 1,
                    "extractionStatus": "ocr_failed",
                    "extractionNotes": f"OCR processing failed or Tesseract engine not configured: {str(ocr_err)}"
                }
        else:
            return {
                "text": "",
                "pageCount": 1,
                "extractionStatus": "ocr_unavailable",
                "extractionNotes": "OCR library (pytesseract) is installed but Tesseract binary is not configured."
            }

    # 3. Fallback: UTF-8 / ASCII text decoding
    try:
        decoded_text = content.decode("utf-8", errors="ignore").strip()
        if decoded_text:
            return {
                "text": decoded_text,
                "pageCount": 1,
                "extractionStatus": "success",
                "extractionNotes": "Extracted text via UTF-8 buffer decoding."
            }
    except Exception as dec_err:
        print(f"Text decoding failed: {dec_err}")

    return {
        "text": "",
        "pageCount": 0,
        "extractionStatus": "failed",
        "extractionNotes": "Unable to extract text from provided document content."
    }
