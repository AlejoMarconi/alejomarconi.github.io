#!/usr/bin/env python3
"""
Fetch the latest official Urquiza schedule PDF from Metrovias and rebuild
src/data/trainSchedules.json.

Pipeline:
  1. Scrape https://metrovias.com.ar/index.php/horarios-del-servicio-linea-urquiza/
     for any link to Horarios-Urquiza-*.pdf.
  2. Download the PDF to a temp file.
  3. Run scripts/parse_horarios_pdf.py against it.
  4. The parser writes src/data/trainSchedules.json. The wrapping GitHub
     Action commits the file when there are changes.

Exit codes:
  0 - success, JSON written, validation passed
  1 - validation failed or warnings raised
  2 - PDF could not be located or downloaded
"""
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urljoin

import urllib.request

REPO_ROOT = Path(__file__).resolve().parent.parent
PARSER = REPO_ROOT / "scripts" / "parse_horarios_pdf.py"
OUTPUT_JSON = REPO_ROOT / "src" / "data" / "trainSchedules.json"

METROVIAS_URL = "https://metrovias.com.ar/index.php/horarios-del-servicio-linea-urquiza/"
USER_AGENT = (
    "Mozilla/5.0 (compatible; UrquizaScheduleBot/1.0; "
    "+https://github.com/alejomarconi/alejomarconi.github.io)"
)
PDF_LINK_RE = re.compile(
    r'href=["\']([^"\']*Horarios[-_]Urquiza[^"\']*\.pdf)["\']',
    re.IGNORECASE,
)


def http_get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def find_pdf_url() -> str:
    """Scrape the Metrovias horarios page for a PDF link."""
    print(f"Fetching {METROVIAS_URL}", flush=True)
    html = http_get(METROVIAS_URL).decode("utf-8", errors="replace")

    matches = PDF_LINK_RE.findall(html)
    if not matches:
        raise RuntimeError(
            "no PDF link matching Horarios-Urquiza-*.pdf found in "
            f"{METROVIAS_URL}; the page layout may have changed"
        )

    # Prefer the most-recently-uploaded URL by sorting on the wp-content path
    # which contains /YYYY/MM/. Fall back to the first match.
    matches = sorted(set(matches), reverse=True)
    href = matches[0]
    if href.startswith("//"):
        href = "https:" + href
    elif href.startswith("/"):
        href = urljoin(METROVIAS_URL, href)
    elif href.startswith("http://"):
        # Upgrade to HTTPS where possible
        href = "https://" + href[len("http://") :]

    print(f"Found PDF: {href}", flush=True)
    return href


def download_pdf(url: str, dst: Path) -> None:
    print(f"Downloading PDF to {dst}", flush=True)
    data = http_get(url)
    if not data.startswith(b"%PDF-"):
        raise RuntimeError(
            f"URL did not return a PDF (first bytes: {data[:20]!r})"
        )
    dst.write_bytes(data)
    print(f"  wrote {len(data):,} bytes", flush=True)


def run_parser(pdf_path: Path, source_url: str) -> int:
    source_filename = source_url.rsplit("/", 1)[-1]
    cmd = [
        sys.executable,
        str(PARSER),
        str(pdf_path),
        str(OUTPUT_JSON),
        "--source-url", source_url,
        "--source-filename", source_filename,
    ]
    print(f"Running parser: {' '.join(cmd)}", flush=True)
    return subprocess.call(cmd)


def main() -> int:
    try:
        pdf_url = find_pdf_url()
    except Exception as e:
        print(f"ERROR: could not find PDF URL: {e}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = Path(tmp) / "horarios-urquiza.pdf"
        try:
            download_pdf(pdf_url, pdf_path)
        except Exception as e:
            print(f"ERROR: download failed: {e}", file=sys.stderr)
            return 2

        rc = run_parser(pdf_path, pdf_url)
        return rc


if __name__ == "__main__":
    sys.exit(main())
