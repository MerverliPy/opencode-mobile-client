#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

python - <<'PY'
from pathlib import Path
import re

path = Path(".opencode/backlog/candidates.yaml")
phase_path = Path(".opencode/plans/current-phase.md")

text = path.read_text()
phase_text = phase_path.read_text()

phase_file_match = re.search(r'(?m)^Phase file:\s*(backlog:[^\s]+)\s*$', phase_text)
status_match = re.search(r'(?m)^Status:\s*(.+)\s*$', phase_text)
ready_match = re.search(r'(?ms)^## Validation.*?^Ready to ship:\s*\n-\s*(yes|no)\s*$', phase_text)
title_match = re.search(r'(?m)^#\s+(.+?)\s*$', phase_text)

current_backlog_id = ""
if phase_file_match:
    current_backlog_id = phase_file_match.group(1).split(":", 1)[1].strip()

current_complete = (status_match.group(1).strip().lower() == "complete") if status_match else False
current_ready = (ready_match.group(1).strip().lower() == "yes") if ready_match else False
current_title = title_match.group(1).strip() if title_match else current_backlog_id

idx_candidates = text.find("candidates:")
idx_deferred = text.find("deferred_local_first_candidates:")
idx_archived = text.find("archived:")

if idx_candidates == -1:
    raise SystemExit("repair-backlog-selection: missing candidates section")

before = text[:idx_candidates]
section_end = len(text)
if idx_deferred != -1:
    section_end = idx_deferred
elif idx_archived != -1:
    section_end = idx_archived

if idx_archived == -1:
    candidate_section = text[idx_candidates + len("candidates:"):section_end].strip()
    deferred_section = text[section_end:].strip() if idx_deferred != -1 else ""
    archived_section = ""
else:
    candidate_section = text[idx_candidates + len("candidates:"):section_end].strip()
    deferred_section = text[idx_deferred:idx_archived].rstrip() if idx_deferred != -1 and idx_deferred < idx_archived else ""
    archived_section = text[idx_archived + len("archived:"):].strip()

def parse_blocks(section):
    if not section or section == "[]":
        return []
    lines = section.splitlines()
    blocks = []
    current = []
    for line in lines:
        if line.startswith("  - id:") and current:
            blocks.append("\n".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        blocks.append("\n".join(current))
    return [b.rstrip() for b in blocks if b.strip()]

candidate_blocks = parse_blocks(candidate_section)
archived_blocks = parse_blocks(archived_section)

def block_id(block):
    m = re.search(r'(?m)^  - id:\s*([A-Za-z0-9._:-]+)\s*$', block)
    return m.group(1) if m else ""

def shipped_true(block):
    return bool(re.search(r'(?m)^\s+shipped:\s*true\s*$', block))

new_candidates = []
moved_blocks = []

for block in candidate_blocks:
    cid = block_id(block)
    if not cid:
        continue
    if shipped_true(block):
        moved_blocks.append(block)
        continue
    if current_backlog_id and cid == current_backlog_id and current_complete and current_ready:
        moved_blocks.append(block)
        continue
    new_candidates.append(block)

archived_ids = {block_id(block) for block in archived_blocks}

for block in moved_blocks:
    cid = block_id(block)
    if cid and cid not in archived_ids:
        normalized = block
        if not re.search(r'(?m)^\s+shipped:\s*', normalized):
            normalized = normalized.rstrip() + "\n    shipped: true"
        archived_blocks.append(normalized)
        archived_ids.add(cid)

if current_backlog_id and current_complete and current_ready and current_backlog_id not in archived_ids:
    archived_blocks.append(
        "  - id: {id}\n"
        "    title: {title}\n"
        "    module: workflow\n"
        "    shipped: true".format(id=current_backlog_id, title=current_title)
    )

out = before
out += "candidates:\n"
if new_candidates:
    out += "\n".join(block.rstrip() for block in new_candidates) + "\n\n"
else:
    out += "  []\n\n"
if deferred_section:
    out += deferred_section.rstrip() + "\n\n"
out += "archived:\n"
if archived_blocks:
    out += "\n\n".join(block.rstrip() for block in archived_blocks) + "\n"
else:
    out += "  []\n"

path.write_text(out)
print("repair-backlog-selection: normalized selectable and archived backlog entries")
PY
