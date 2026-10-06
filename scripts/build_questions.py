#!/usr/bin/env python3
"""Convert the question bank spreadsheet into the data file the website loads.

Usage:
    python3 scripts/build_questions.py [input.xlsx] [output.js]

Defaults: data/questions.xlsx -> assets/questions.js

Any sheet with a header row naming these columns is read (column order and
extra columns do not matter; sheets without them, such as instructions, are
skipped):

    required: السؤال (or نص السؤال) | الخيارات | الإجابة الصحيحة | المستوى
    optional: م | النظام | نمط السؤال | السند النظامي (ذو الارتباط) | شرح مبسط

Options go in the "الخيارات" cell, separated by "؛" or written one per line,
and the "الإجابة الصحيحة" cell must match one of them exactly. Questions are grouped
by the "النظام" column (or by sheet when it is absent). Columns not listed
above, such as "محور القياس" or review notes, are never published.
"""

import json
import re
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IN = ROOT / "data" / "questions.xlsx"
DEFAULT_OUT = ROOT / "assets" / "questions.js"

LEVELS = [
    (1, "الأول (تأسيسي)", ("الأول", "تأسيسي")),
    (2, "المتوسط", ("المتوسط",)),
    (3, "المتقدم", ("المتقدم",)),
]

TYPES = [
    ("tf", "صح/خطأ", ("صح", "خطأ")),
    ("exclude", "استبعاد الخيار الخاطئ", ("استبعاد",)),
    ("mcq", "اختيار من متعدد", ("اختيار",)),
]

# Field -> accepted header names (compared after collapsing spaces).
COLUMNS = {
    "n": ("م",),
    "system": ("النظام",),
    "level": ("المستوى",),
    "type": ("نمط السؤال",),
    "text": ("نص السؤال", "السؤال"),
    "options": ("الخيارات",),
    "answer": ("الإجابة الصحيحة",),
    "reference": ("السند النظامي ذو الارتباط", "السند النظامي"),
    "explanation": ("شرح مبسط", "الشرح"),
}
REQUIRED = ("text", "options", "answer", "level")


def clean(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(lines).strip()


def match(value, table, what, where):
    for key, _label, needles in table:
        if any(n in value for n in needles):
            return key
    raise ValueError(f"{where}: unknown {what} '{value}'")


def system_name(raw):
    # "1- نظام الكهرباء" -> "نظام الكهرباء"
    return re.sub(r"^\s*\d+\s*[-–.)]\s*", "", raw or "").strip()


def short_name(name):
    # "نظام الكهرباء" -> "الكهرباء" (used in the results sheet)
    return re.sub(r"^نظام\s+", "", name).strip() or name


def find_header(rows):
    """Return (row index, {field: column index}) for the first header row, or (None, None)."""
    for i, row in enumerate(rows[:10]):
        names = [re.sub(r"\s+", " ", clean(v)) for v in row]
        cols = {}
        for field, accepted in COLUMNS.items():
            for c, name in enumerate(names):
                if name in accepted:
                    cols[field] = c
                    break
        if all(f in cols for f in REQUIRED):
            return i, cols
    return None, None


def build(src):
    wb = openpyxl.load_workbook(src, data_only=True)
    systems = {}  # name -> list of questions, in order of first appearance
    errors, seen = [], set()

    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        header, cols = find_header(rows)
        if header is None:
            continue  # instructions sheet or anything else without the header

        for row_no, row in enumerate(rows[header + 1:], start=header + 2):
            def get(field):
                c = cols.get(field)
                return clean(row[c]) if c is not None and c < len(row) else ""

            text = get("text")
            if not text:
                continue
            where = f"[{ws.title}] row {row_no}"
            num = get("n") or str(row_no)
            if num in seen:
                errors.append(f"{where}: question number '{num}' is used twice")
                continue
            seen.add(num)

            opts = [o.strip() for o in re.split(r"[\n؛]", get("options")) if o.strip()]
            try:
                level = match(get("level"), LEVELS, "level", where)
                if get("type"):
                    qtype = match(get("type"), TYPES, "question type", where)
                else:
                    qtype = "tf" if sorted(opts) == sorted(["صح", "خطأ"]) else "mcq"
            except ValueError as exc:
                errors.append(str(exc))
                continue

            if qtype == "tf" and not opts:
                opts = ["صح", "خطأ"]
            answer = get("answer")
            if len(opts) < 2:
                errors.append(f"{where}: needs at least two options")
                continue
            if answer not in opts:
                errors.append(f"{where}: correct answer '{answer}' is not one of the options")
                continue

            name = system_name(get("system")) or ws.title.strip()
            systems.setdefault(name, []).append({
                "id": num,
                "n": num,
                "level": level,
                "type": qtype,
                "text": text,
                "options": opts,
                "answer": opts.index(answer),
                "reference": get("reference"),
                "explanation": get("explanation"),
            })

    if errors:
        raise SystemExit("Spreadsheet problems:\n  " + "\n  ".join(errors))
    if not systems:
        raise SystemExit("No questions found: a sheet needs a header row with "
                         "'نص السؤال', 'الخيارات', 'الإجابة الصحيحة' and 'المستوى'.")

    return {
        "levels": {str(k): label for k, label, _ in LEVELS},
        "systems": [
            {"id": i, "name": name, "short": short_name(name), "questions": questions}
            for i, (name, questions) in enumerate(systems.items(), start=1)
        ],
    }


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    data = build(src)
    body = json.dumps(data, ensure_ascii=False, indent=1)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        "// Generated by scripts/build_questions.py from data/questions.xlsx — do not edit by hand.\n"
        f"window.QUIZ_DATA = {body};\n",
        encoding="utf-8",
    )
    total = sum(len(s["questions"]) for s in data["systems"])
    print(f"Wrote {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}: "
          f"{len(data['systems'])} regulations, {total} questions")


if __name__ == "__main__":
    main()
