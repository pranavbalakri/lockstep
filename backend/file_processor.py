from __future__ import annotations
import base64
import pdfplumber
from io import BytesIO
from models import FileInfo


# Maximum words for text content
MAX_TEXT_WORDS = 3000
# Maximum images for multimodal evaluation
MAX_IMAGES = 3


def extract_text_from_pdf(base64_data: str) -> str:
    """Extract text content from a PDF file."""
    pdf_bytes = base64.b64decode(base64_data)
    text_parts: list[str] = []

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n\n".join(text_parts)


def extract_text_from_code(base64_data: str, filename: str) -> str:
    """Extract text content from a code file."""
    try:
        code_bytes = base64.b64decode(base64_data)
        content = code_bytes.decode("utf-8", errors="replace")
        return f"=== FILE: {filename} ===\n{content}\n=== END FILE ==="
    except Exception:
        return f"[Could not read code file: {filename}]"


def extract_text_from_text_file(base64_data: str, filename: str) -> str:
    """Extract text content from a plain text or markdown file."""
    try:
        text_bytes = base64.b64decode(base64_data)
        return text_bytes.decode("utf-8", errors="replace")
    except Exception:
        return f"[Could not read text file: {filename}]"


def truncate_text(text: str, max_words: int = MAX_TEXT_WORDS) -> tuple[str, bool]:
    """Truncate text to max words, returning (truncated_text, was_truncated)."""
    words = text.split()
    if len(words) <= max_words:
        return text, False
    truncated = " ".join(words[:max_words])
    return truncated + "\n\n[TRUNCATED - content exceeded word limit]", True


def process_files(files: list[FileInfo]) -> tuple[str, list[dict]]:
    """
    Process files for AI evaluation.

    Returns:
        tuple: (text_content, image_blocks)
        - text_content: Combined text from PDFs, code files, and text files
        - image_blocks: List of image content blocks for Claude vision API
    """
    text_parts: list[str] = []
    image_blocks: list[dict] = []
    image_count = 0

    for file in files:
        if file.fileType == "image":
            if image_count < MAX_IMAGES:
                image_blocks.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": file.mimeType,
                        "data": file.base64,
                    },
                })
                image_count += 1
            else:
                text_parts.append(f"[Additional image not included: {file.filename}]")

        elif file.mimeType == "application/pdf":
            try:
                pdf_text = extract_text_from_pdf(file.base64)
                text_parts.append(f"=== PDF: {file.filename} ===\n{pdf_text}\n=== END PDF ===")
            except Exception as e:
                text_parts.append(f"[Could not extract text from PDF {file.filename}: {str(e)}]")

        elif file.fileType == "code":
            code_text = extract_text_from_code(file.base64, file.filename)
            text_parts.append(code_text)

        elif file.mimeType in ("text/plain", "text/markdown"):
            text_content = extract_text_from_text_file(file.base64, file.filename)
            text_parts.append(text_content)

        else:
            text_parts.append(f"[Unsupported file type: {file.filename} ({file.mimeType})]")

    combined_text = "\n\n".join(text_parts)
    truncated_text, was_truncated = truncate_text(combined_text)

    return truncated_text, image_blocks
