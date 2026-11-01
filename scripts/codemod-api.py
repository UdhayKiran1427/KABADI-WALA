#!/usr/bin/env python3
"""One-off codemod: collapse JSON-parse+zod boilerplate to parseBody() and leaky 500 catches to apiErrorFrom().
Usage: python3 -I scripts/codemod-api.py [--write]"""
import glob
import re
import sys

WRITE = "--write" in sys.argv

PARSE = re.compile(
    r'(?P<i>[ ]+)let body: unknown;\n'
    r'(?P=i)try \{\n(?P=i)  body = await req\.json\(\);\n(?P=i)\} catch \{\n'
    r'(?P=i)  return apiError\("INVALID_JSON", "Malformed JSON request body", 400\);\n(?P=i)\}\n'
    r'(?P=i)const parsed = (?P<schema>\w+)\.safeParse\(body\);\n'
    r'(?P=i)if \(!parsed\.success\) \{\n'
    r'(?P=i)  return apiError\("VALIDATION_ERROR", parsed\.error\.issues\[0\]\.message, 400\);\n(?P=i)\}\n'
)
CATCH = re.compile(
    r'\} catch \((?:err|e|error)(?:: unknown)?\) \{\n'
    r'(?P<i>[ ]+)const errorMsg = (?:err|e|error) instanceof Error \? (?:err|e|error)\.message : String\((?:err|e|error)\);\n'
    r'(?P=i)return apiError\("[A-Z_]+", errorMsg, 500\);\n'
)

stats = {"parse": 0, "catch": 0, "files": 0}
for path in glob.glob("src/app/api/**/route.ts", recursive=True):
    s = open(path).read()
    orig = s

    def parse_repl(m):
        i = m.group("i")
        return (f'{i}const {{ body, response: bodyError }} = await parseBody(req, {m.group("schema")});\n'
                f'{i}if (bodyError) return bodyError;\n')

    s, n1 = PARSE.subn(parse_repl, s)
    if n1:
        s = s.replace("parsed.data", "body")
        s = re.sub(r'import \{([^}]*)\} from "@/lib/apiResponse";',
                   lambda m: 'import {' + m.group(1).rstrip() + (', ' if not m.group(1).rstrip().endswith(',') else ' ') + 'parseBody } from "@/lib/apiResponse";', s, count=1)
    s, n2 = CATCH.subn('} catch (err) {\n    return apiErrorFrom(err);\n', s)
    if n2 and "apiErrorFrom" not in orig:
        s = re.sub(r'import \{([^}]*)\} from "@/lib/apiResponse";',
                   lambda m: 'import {' + m.group(1).rstrip() + ', apiErrorFrom }' + ' from "@/lib/apiResponse";', s, count=1)
    if s != orig:
        stats["files"] += 1
        stats["parse"] += n1
        stats["catch"] += n2
        if WRITE:
            open(path, "w").write(s)
print(stats)
