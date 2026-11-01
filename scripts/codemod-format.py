#!/usr/bin/env python3
"""One-off codemod: replace inline paise/grams conversions in UI files with lib/format helpers."""
import re
import subprocess

EXPR = r'\(?([A-Za-z_][\w.?]*(?: \?\? 0)?)\)?'
RULES = [
    (re.compile(r'\(' + EXPR + r' / 1000\)\.toFixed\((\d)\)'),
     lambda m: f'kg({m.group(1)}, {m.group(2)})' if m.group(2) != "1" else f'kg({m.group(1)})', "kg"),
    (re.compile(r'\(' + EXPR + r' / 100\)\.toFixed\((\d)\)'),
     lambda m: f'rupees({m.group(1)}, {m.group(2)})' if m.group(2) != "0" else f'rupees({m.group(1)})', "rupees"),
    (re.compile(r'\(' + EXPR + r' / 100\)\.toLocaleString\("en-IN"\)'),
     lambda m: f'rupeesIN({m.group(1)})', "rupeesIN"),
]

files = subprocess.run(
    ["find", "src/app", "src/components", "-name", "*.tsx"], capture_output=True, text=True
).stdout.split("\n")
total = 0
for path in filter(None, files):
    s = open(path).read()
    used = set()
    for rx, fn, name in RULES:
        s, n = rx.subn(fn, s)
        if n:
            used.add(name)
            total += n
    if not used:
        continue
    imp = f'import {{ {", ".join(sorted(used))} }} from "@/lib/format";\n'
    # insert after the last top-level import line (handles "use client" first line)
    lines = s.split("\n")
    last = max(i for i, l in enumerate(lines) if l.startswith("import ") or re.match(r'^\} from ', l))
    lines.insert(last + 1, imp.rstrip("\n"))
    open(path, "w").write("\n".join(lines))
    print(path, sorted(used))
print("replacements:", total)
