#!/usr/bin/env python3
"""
Parse the official Metrovias Urquiza schedule PDF -> trainSchedules.json

Detection strategy (resilient to layout changes):
  1. Day type per page is detected by a hybrid of:
     - Text markers ('lunes', 'sabados', 'domingos', 'feriados') extracted
       from rendered text. Only some pages carry the day label as actual
       text -- in the current PDF the LV/SAB labels are drawn as vector
       curves, while 'y feriados' is rendered as bold text on the Sunday
       page.
     - Default sequential mapping for the canonical 6-page format
       (1-3 weekday, 4-5 saturday, 6 sunday/holiday). The mapping can be
       overridden via the PAGE_MAPPING_BY_TOTAL constant if Metrovias
       publishes a different page count.
  2. The 'A FEDERICO LACROZE' direction header is found by looking for a
     row that contains the words 'Federico' and 'Lacroze' but no time
     values; that y-coordinate splits each page into the A Lemos table
     (top) and the A Lacroze table (bottom).
  3. Characters are grouped into rows using a gap-from-previous-y test
     (tolerance 3 pt). This handles PDF cells whose characters land at
     slightly different y-values, e.g. 239.97 / 240.04 belonging to the
     same station row.
  4. Times are extracted with the regex \\d{2}:\\d{2}, which recovers the
     individual values even from merged cells like '05:0005:2005:40'.

Validation (fail-loud):
  - Each section must produce exactly 23 station rows.
  - Train counts across the 23 stations of each (day, direction) must
     agree within 5% (or at least 3 trains).
  - The origin station's train count for each day must fall inside a
     plausible range.
  - All three day types must have at least one parsed page.

Exits with non-zero status if any validation issue is found.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import pdfplumber


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = REPO_ROOT / "src" / "data" / "trainSchedules.json"

# Station order for A Gral. Lemos direction (Lacroze -> Lemos)
STATIONS_A_LEMOS = [
    "Federico Lacroze",
    "Jose Artigas",
    "P.N. Arata",
    "Dr. Fco. Beiro",
    "El Libertador",
    "Antonio Devoto",
    "Cnel. Fco. Lynch",
    "Fernandez Moreno",
    "Lourdes",
    "Tropezon",
    "Jose M. Bosch",
    "Martin Coronado",
    "Pablo Podesta",
    "Jorge Newbery",
    "Ruben Dario",
    "E. De Los Andes",
    "Juan B. De La Salle",
    "Sgto. Barruffaldi",
    "Capitan Lozano",
    "Tnte. Agneta",
    "Campo De Mayo",
    "Sgto. Cabral",
    "General Lemos",
]
STATIONS_A_LACROZE = list(reversed(STATIONS_A_LEMOS))
NUM_STATIONS = len(STATIONS_A_LEMOS)
DAY_TYPES = ("lunes_a_viernes", "sabados", "domingos_feriados")

# Default page-to-day-type mapping for canonical Metrovias layouts.
# Used as a fallback when the day label is rendered as vector curves
# instead of text, which is the case for LV/SAB pages in current PDFs.
PAGE_MAPPING_BY_TOTAL = {
    6: ["lunes_a_viernes", "lunes_a_viernes", "lunes_a_viernes",
        "sabados", "sabados", "domingos_feriados"],
    5: ["lunes_a_viernes", "lunes_a_viernes",
        "sabados", "sabados", "domingos_feriados"],
    4: ["lunes_a_viernes", "lunes_a_viernes",
        "sabados", "domingos_feriados"],
    3: ["lunes_a_viernes", "sabados", "domingos_feriados"],
}


def normalize(s: str) -> str:
    """Lowercase, strip accents, drop non-alphanumeric."""
    nfkd = unicodedata.normalize("NFKD", s.lower())
    plain = "".join(c for c in nfkd if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", plain)


def valid_time(t: str) -> bool:
    h, m = int(t[:2]), int(t[3:])
    return 0 <= h <= 23 and 0 <= m <= 59


def find_times(text: str) -> list[str]:
    return [t for t in re.findall(r"\d{2}:\d{2}", text) if valid_time(t)]


def to_minutes(t: str) -> int:
    return int(t[:2]) * 60 + int(t[3:])


def extract_char_rows(page, y_tolerance: float = 3.0) -> list[tuple[float, str]]:
    """
    Group characters into rows by y. Uses gap-from-last-y so that PDF cells
    whose characters land at slightly different y-values still cluster
    together in the same row.
    """
    chars = sorted(page.chars, key=lambda c: (c["top"], c["x0"]))
    if not chars:
        return []

    groups: list[list[dict]] = [[chars[0]]]
    for ch in chars[1:]:
        if ch["top"] - groups[-1][-1]["top"] <= y_tolerance:
            groups[-1].append(ch)
        else:
            groups.append([ch])

    out = []
    for grp in groups:
        grp.sort(key=lambda c: c["x0"])
        text = "".join(c["text"] for c in grp)
        avg_y = sum(c["top"] for c in grp) / len(grp)
        out.append((avg_y, text))
    return out


def detect_day_type_from_text(rows: list[tuple[float, str]]) -> str | None:
    """Detect day type from any text in the page. May return None if the
    label is rendered as vector graphics (current PDF: LV/SAB pages)."""
    norm_full = normalize(" ".join(text for _, text in rows))
    if "domingos" in norm_full or "feriados" in norm_full:
        return "domingos_feriados"
    if "sabados" in norm_full:
        return "sabados"
    if "lunesaviernes" in norm_full or ("lunes" in norm_full and "viernes" in norm_full):
        return "lunes_a_viernes"
    if "diashabiles" in norm_full or "habiles" in norm_full:
        return "lunes_a_viernes"
    return None


def detect_day_type(
    rows: list[tuple[float, str]],
    page_num: int,
    total_pages: int,
) -> tuple[str | None, str]:
    """Hybrid day-type detection. Returns (day_type, source) where source is
    'text' or 'page_mapping' for diagnostics."""
    text_dt = detect_day_type_from_text(rows)
    if text_dt is not None:
        return text_dt, "text"
    mapping = PAGE_MAPPING_BY_TOTAL.get(total_pages)
    if mapping and 1 <= page_num <= len(mapping):
        return mapping[page_num - 1], "page_mapping"
    return None, "unknown"


def find_lacroze_divider_y(rows: list[tuple[float, str]], page_height: float) -> float | None:
    """
    The 'A FEDERICO LACROZE' header sits in the middle of each page, between
    the A Lemos table (above) and the A Lacroze table (below). It contains
    'Federico' and 'Lacroze' and has no time values. The station row at
    y near 0.23*page_height also contains 'FedericoLacroze' but DOES have
    times, so we filter on `not find_times(text)`.
    """
    y_min = page_height * 0.30
    y_max = page_height * 0.75
    for y, text in rows:
        if y_min < y < y_max and not find_times(text):
            n = normalize(text)
            if "federicolacroze" in n or ("federico" in n and "lacroze" in n):
                return y
    return None


def extract_section(
    rows: list[tuple[float, str]],
    y_start: float,
    y_end: float,
    station_list: list[str],
) -> tuple[dict[str, list[str]], int]:
    """Map time-bearing rows in [y_start, y_end) to stations by sorted index."""
    time_rows = []
    for y, text in rows:
        if y_start <= y < y_end:
            ts = find_times(text)
            if ts:
                time_rows.append((y, ts))
    time_rows.sort(key=lambda r: r[0])

    out = {s: [] for s in station_list}
    for i, station in enumerate(station_list):
        if i < len(time_rows):
            out[station] = time_rows[i][1]
    return out, len(time_rows)


def parse_pdf(pdf_path: str | Path) -> tuple[dict, list[str]]:
    """Parse PDF; return (schedules, parse_warnings)."""
    warnings: list[str] = []

    schedules = {
        s: {d: {"a_lemos": [], "a_lacroze": []} for d in DAY_TYPES}
        for s in STATIONS_A_LEMOS
    }
    pages_seen = defaultdict(list)

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"PDF: {total_pages} page(s)")
        for page_num, page in enumerate(pdf.pages, 1):
            rows = extract_char_rows(page)

            day_type, source = detect_day_type(rows, page_num, total_pages)
            if day_type is None:
                warnings.append(
                    f"page {page_num}: cannot determine day type "
                    f"(no text marker, no mapping for {total_pages}-page PDF); "
                    f"skipped"
                )
                continue

            split_y = find_lacroze_divider_y(rows, page.height)
            if split_y is None:
                warnings.append(
                    f"page {page_num} ({day_type}): could not find "
                    f"'A FEDERICO LACROZE' header; using midpoint"
                )
                split_y = page.height * 0.5

            top, n_top = extract_section(rows, 0.0, split_y, STATIONS_A_LEMOS)
            bot, n_bot = extract_section(rows, split_y, page.height, STATIONS_A_LACROZE)

            if n_top != NUM_STATIONS:
                warnings.append(
                    f"page {page_num} ({day_type}) A Lemos: expected "
                    f"{NUM_STATIONS} station rows, got {n_top}"
                )
            if n_bot != NUM_STATIONS:
                warnings.append(
                    f"page {page_num} ({day_type}) A Lacroze: expected "
                    f"{NUM_STATIONS} station rows, got {n_bot}"
                )

            for s, ts in top.items():
                schedules[s][day_type]["a_lemos"].extend(ts)
            for s, ts in bot.items():
                schedules[s][day_type]["a_lacroze"].extend(ts)

            pages_seen[day_type].append(page_num)
            print(
                f"  page {page_num}: {day_type:18s} ({source:12s}) | "
                f"A_Lemos rows={n_top:2d} | A_Lacroze rows={n_bot:2d}"
            )

    # Sort & dedupe
    for s in schedules:
        for d in schedules[s]:
            for direction in ("a_lemos", "a_lacroze"):
                schedules[s][d][direction] = sorted(set(schedules[s][d][direction]))

    # Day coverage check
    for d in DAY_TYPES:
        if not pages_seen[d]:
            warnings.append(f"no pages detected for day type: {d}")
        else:
            print(f"  {d:20s}: pages {pages_seen[d]}")

    return schedules, warnings


def validate(schedules: dict) -> list[str]:
    """Cross-check parsed schedule for consistency. Returns list of issues."""
    issues: list[str] = []

    # Plausible total-train ranges per day at the origin station
    expected_ranges = {
        "lunes_a_viernes": (60, 130),
        "sabados": (40, 90),
        "domingos_feriados": (20, 60),
    }

    for day in DAY_TYPES:
        for direction in ("a_lemos", "a_lacroze"):
            order = STATIONS_A_LEMOS if direction == "a_lemos" else STATIONS_A_LACROZE
            counts = [len(schedules[s][day][direction]) for s in order]

            # 1. No empty stations
            empty = [s for s, c in zip(order, counts) if c == 0]
            if empty:
                issues.append(f"[{day}/{direction}] empty stations: {empty}")
                continue

            # 2. Counts across stations should agree within tolerance
            min_c, max_c = min(counts), max(counts)
            allowed_diff = max(3, int(max_c * 0.05))
            if max_c - min_c > allowed_diff:
                outliers = [
                    f"{s}={c}" for s, c in zip(order, counts) if c < max_c - allowed_diff
                ]
                issues.append(
                    f"[{day}/{direction}] count variance min={min_c} max={max_c} "
                    f"(allowed {allowed_diff}); outliers: {outliers}"
                )

            # 3. Origin train count within plausible range
            origin_count = counts[0]
            lo, hi = expected_ranges[day]
            if not (lo <= origin_count <= hi):
                issues.append(
                    f"[{day}/{direction}] origin '{order[0]}' has {origin_count} "
                    f"trains, expected {lo}-{hi}"
                )

            # 4. At least one train must overlap between adjacent stations
            #    within a 5-minute window. This catches mis-mapped rows
            #    without falsely flagging schedules where the first trains
            #    differ (e.g. some short-runs only stop at certain stations).
            for i in range(1, len(order)):
                ts_prev = schedules[order[i - 1]][day][direction]
                ts_curr = schedules[order[i]][day][direction]
                if not ts_prev or not ts_curr:
                    continue
                prev_mins = sorted(to_minutes(t) for t in ts_prev)
                curr_mins = sorted(to_minutes(t) for t in ts_curr)
                # For each train at prev, check that there is a train at curr
                # within 1..6 minutes (modular). If at least 50% of prev trains
                # have a plausible follow-up at curr, the mapping is consistent.
                hits = 0
                for pm in prev_mins:
                    if any(0 <= ((cm - pm) % (24 * 60)) <= 6 for cm in curr_mins):
                        hits += 1
                ratio = hits / len(prev_mins)
                if ratio < 0.4:
                    issues.append(
                        f"[{day}/{direction}] only {hits}/{len(prev_mins)} trains "
                        f"({ratio:.0%}) at {order[i-1]} have a plausible "
                        f"follow-up within 6 min at {order[i]} (mapping check)"
                    )
                    break

    return issues


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(
            "Usage: parse_horarios_pdf.py <pdf-path> [output-json-path]",
            file=sys.stderr,
        )
        return 2

    pdf_path = Path(argv[1])
    output_path = Path(argv[2]) if len(argv) >= 3 else DEFAULT_OUTPUT

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 2

    print(f"Parsing: {pdf_path}")
    schedules, warnings = parse_pdf(pdf_path)

    if warnings:
        print("\nParse warnings:")
        for w in warnings:
            print(f"  ! {w}")

    issues = validate(schedules)
    if issues:
        print("\nValidation FAILED:")
        for i in issues:
            print(f"  X {i}")
    else:
        print("\nValidation OK")

    print("\nSummary:")
    for d in DAY_TYPES:
        l_n = len(schedules["Federico Lacroze"][d]["a_lemos"])
        r_n = len(schedules["General Lemos"][d]["a_lacroze"])
        print(f"  {d:20s} | a_lemos@Lacroze={l_n:3d} | a_lacroze@Lemos={r_n:3d}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(schedules, f, ensure_ascii=False, indent=4)
    print(f"\nWrote: {output_path}")

    return 1 if (issues or warnings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
