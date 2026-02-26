import re
from typing import Optional
from PIL import Image
import io


def extract_receipt_data(image_bytes: bytes) -> dict:
    """
    Extracts text from a receipt image using Tesseract OCR,
    then parses out amount and description.
    """
    try:
        import pytesseract
        image = Image.open(io.BytesIO(image_bytes))
        image = image.convert("RGB")

        # Enhance contrast for better OCR
        from PIL import ImageEnhance, ImageFilter
        image = image.filter(ImageFilter.SHARPEN)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        raw_text = pytesseract.image_to_string(image, lang="eng+rus")
    except Exception as e:
        raw_text = ""

    amount = _extract_amount(raw_text)
    description = _extract_description(raw_text)
    date = _extract_date(raw_text)

    return {
        "raw_text": raw_text,
        "amount": amount,
        "description": description,
        "date": date,
        "draft_transaction": {
            "amount": amount,
            "description": description or "Receipt upload",
            "date": date,
            "type": "expense",
            "category": "",
        }
    }


def _extract_amount(text: str) -> Optional[float]:
    patterns = [
        r'(?:total|итого|сумма|amount|sum)[:\s]+([0-9]+[.,][0-9]{2})',
        r'(?:total|итого|сумма|amount)[:\s]+([0-9]+)',
        r'\b([0-9]{1,3}(?:[,\s][0-9]{3})*[.,][0-9]{2})\b',
        r'\b([0-9]+[.,][0-9]{2})\b',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw = match.group(1).replace(',', '.').replace(' ', '')
            try:
                return float(raw)
            except ValueError:
                continue
    return None


def _extract_description(text: str) -> Optional[str]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return None
    # Return the first meaningful line as description
    for line in lines[:5]:
        if len(line) > 3 and not re.match(r'^[\d\s\.,]+$', line):
            return line[:100]
    return lines[0][:100] if lines else None


def _extract_date(text: str) -> Optional[str]:
    patterns = [
        r'(\d{2}[./]\d{2}[./]\d{4})',
        r'(\d{4}[./\-]\d{2}[./\-]\d{2})',
        r'(\d{2}[./]\d{2}[./]\d{2})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            raw = match.group(1)
            # Try to normalize to YYYY-MM-DD
            for fmt in ('%d.%m.%Y', '%d/%m/%Y', '%Y-%m-%d', '%Y.%m.%d', '%d.%m.%y'):
                try:
                    from datetime import datetime
                    return datetime.strptime(raw.replace('/', '.'), fmt.replace('/', '.')).strftime('%Y-%m-%d')
                except ValueError:
                    continue
    return None
