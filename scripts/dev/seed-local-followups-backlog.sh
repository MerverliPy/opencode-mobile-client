#!/usr/bin/env bash
set -euo pipefail

PHASE_ID="${1:-}"
if [[ -z "$PHASE_ID" ]]; then
  echo "Usage: bash scripts/dev/seed-local-followups-backlog.sh <phase-id>" >&2
  exit 1
fi

python - "$PHASE_ID" <<'PY'
from pathlib import Path
import sys

phase_id = sys.argv[1]
path = Path('.opencode/backlog/candidates.yaml')

selection_order = [
    'explicit_user_scope',
    'highest_priority',
    'same_module_followup',
    'smallest_safe_scope',
    'clearest_validation',
]

queue_rules = [
    'Only entries under `candidates` are selectable.',
    'Entries under `archived` are retained so shipped backlog references remain valid.',
    'Keep future local-first follow-up work under `deferred_local_first_candidates` until it is intentionally promoted.',
    'Use `/autoflow` as the default execution path after `/phase-status` or `/next-phase`.',
    'Use `target_release` and `release_bump` to guide the next phase\'s version target.',
    'Prefer borrowing architecture and contracts from `open-agents`, not transplanting its full stack.',
]

constraints = {
    'max_files_changed': 6,
    'prefer_single_module': 'true',
    'avoid_generic_tasks': 'true',
}

phases = [
    {
        'id': 'session-lifecycle-actions',
        'title': 'Add rename and delete actions so local sessions stay manageable on a phone',
        'module': 'session-state',
        'priority': 16,
        'release_bump': 'patch',
        'target_release': 'v1.7.3',
        'execution_flow': '/autoflow',
        'expected_max_files_changed': 4,
        'drivers': [
            '`src/ui/screens.js` currently exposes local sessions but does not let the user rename or delete them from the mobile flow.',
            'The next bounded phase should stay focused on lifecycle controls and deterministic fallback behavior, not broader search, export, or share work.',
        ],
        'files': [
            'src/main.js',
            'src/ui/screens.js',
            'src/state/session-state.js',
            'tests/quality-gates.smoke.test.js',
        ],
        'validation': 'npm run validate:local && npm run browser:smoke && npm run release:proof',
        'acceptance': [
            'The Sessions screen exposes explicit rename and delete controls that remain usable on narrow screens.',
            'Renaming a session preserves its messages, tool results, runtime metadata, and selection state.',
            'Deleting the selected session picks a deterministic fallback session or returns Task to an honest empty state.',
            'Regression coverage proves rename/delete behavior without widening into search, export/import, or tool-drawer share work.',
        ],
    },
    {
        'id': 'session-search-filter',
        'title': 'Add session search and empty-filter states so larger local histories remain usable',
        'module': 'session-state',
        'priority': 15,
        'release_bump': 'patch',
        'target_release': 'v1.7.4',
        'execution_flow': '/autoflow',
        'expected_max_files_changed': 4,
        'drivers': [
            'The current Sessions view is easy to scan with a handful of items but does not scale once local history grows on-device.',
            'This phase should add search and filtered empty states without widening into rename/delete or export/import work.',
        ],
        'files': [
            'src/main.js',
            'src/ui/screens.js',
            'src/state/session-state.js',
            'tests/quality-gates.smoke.test.js',
        ],
        'validation': 'npm run validate:local && npm run browser:smoke && npm run release:proof',
        'acceptance': [
            'The Sessions screen exposes a search input that narrows visible sessions using existing session metadata.',
            'The UI shows a distinct empty-filter state when sessions exist but none match the current query.',
            'Filtering does not corrupt selected-session state or break the current task handoff.',
            'Regression coverage proves query, clear, and empty-filter behavior without widening into export/import or tool-drawer share work.',
        ],
    },
    {
        'id': 'session-export-import',
        'title': 'Add local JSON export and import so device-only sessions can be backed up and moved safely',
        'module': 'storage',
        'priority': 14,
        'release_bump': 'patch',
        'target_release': 'v1.7.5',
        'execution_flow': '/autoflow',
        'expected_max_files_changed': 5,
        'drivers': [
            'Local-only sessions still need a bounded backup and restore path before the phone workflow is trustworthy for longer-lived work.',
            'The phase should stay focused on JSON export/import, validation, and normalization rather than cloud sync or multi-device merge behavior.',
        ],
        'files': [
            'src/main.js',
            'src/ui/screens.js',
            'src/state/storage.js',
            'src/state/session-state.js',
            'tests/quality-gates.smoke.test.js',
        ],
        'validation': 'npm run validate:local && npm run browser:smoke && npm run release:proof',
        'acceptance': [
            'The app can export local session data to a bounded JSON payload without mutating existing sessions.',
            'The import path validates and normalizes incoming JSON before persisting any changes.',
            'Invalid imports fail honestly and leave the current stored sessions untouched.',
            'Regression coverage proves export/import success and failure paths without widening into cloud sync or account features.',
        ],
    },
    {
        'id': 'tool-drawer-copy-share',
        'title': 'Add copy and share actions for file and diff output so generated results are reusable on mobile',
        'module': 'tool-results',
        'priority': 13,
        'release_bump': 'patch',
        'target_release': 'v1.7.6',
        'execution_flow': '/autoflow',
        'expected_max_files_changed': 4,
        'drivers': [
            'The current tool drawer renders readable file and diff output but does not let the user reuse those results through copy or share actions.',
            'This phase should stay bounded to result serialization and mobile share/copy affordances, not broader editing or export workflows.',
        ],
        'files': [
            'src/main.js',
            'src/ui/tool-drawer.js',
            'src/lib/tool-results.js',
            'tests/quality-gates.smoke.test.js',
        ],
        'validation': 'npm run validate:local && npm run browser:smoke && npm run release:proof',
        'acceptance': [
            'The tool drawer exposes copy and share actions for file and diff results.',
            'Copied or shared text preserves enough filename and diff context to remain useful outside the app.',
            'Unsupported share targets or clipboard failures fail honestly without breaking drawer navigation.',
            'Regression coverage proves file and diff reuse behavior without widening into editing or cloud export features.',
        ],
    },
]

archived = [
    ('browser-proof-automation', 'Replace manual browser-proof handoff with a repeatable repo-owned screenshot capture path', 'browser-validation'),
    ('backlog-lifecycle-gating', 'Prevent completed backlog items from being reselected by the phase workflow', 'workflow'),
    ('browser-proof-runner', 'Add repo-root browser-proof and release-proof helpers for SSH/iPhone workflows', 'browser-validation'),
    ('phase-validation-status-normalization', 'Normalize new phase templates so validation status starts as pending', 'workflow'),
    ('clean-install-reproducibility', 'Restore deterministic clean installs so repo setup and workflow gates are trustworthy', 'tooling'),
    ('remote-runtime-contract', 'Define the remote runtime contract and durable run model for mobile remote coding', 'remote-runtime'),
    ('remote-run-shell-state', 'Add durable remote run lifecycle states and reconnect controls to the mobile shell', 'remote-runtime'),
    ('remote-backend-http-bridge', 'Add the first real backend bridge so the mobile shell can talk to a remote coding runtime', 'remote-runtime'),
    ('repo-binding-surface', 'Add repo, branch, and workspace binding surfaces so remote sessions are tied to real coding targets', 'repo-session'),
    ('remote-preview-share-surface', 'Add remote preview link and read-only share surfaces so phone-based review is practical', 'remote-runtime'),
    ('workflow-validation-metadata-alignment', 'Normalize workflow validation metadata so phase state parses consistently', 'workflow'),
    ('backlog-selection-determinism', 'Repair backlog selection so only true candidates remain selectable', 'workflow'),
    ('workflow-gate-revalidation-evidence', 'Re-run workflow gates and capture authoritative evidence after workflow repairs', 'workflow'),
    ('vite-security-refresh', 'Refresh Vite and related lockfile entries to reduce known development-server advisories', 'tooling'),
    ('session-state-normalization-deduplication', 'Deduplicate session-state normalization helpers so runtime metadata cannot drift', 'session-state'),
    ('main-shell-helper-extraction', 'Extract bounded shell helpers from src/main.js to reduce maintenance risk', 'shell'),
    ('mobile-voice-prompt-entry', 'Add optional voice prompt entry for remote coding requests on iPhone', 'input'),
    ('remote-response-ownership', 'Make remote runs own assistant responses instead of the local mock path', 'workflow'),
    ('browser-proof-clean-checkout-runner', 'Restore clean-checkout browser proof with repo-owned Playwright resolution', 'browser-validation'),
    ('browser-proof-command-surface-alignment', 'Align browser-proof command surfaces with the real runner and proof flow', 'browser-validation'),
    ('browser-proof-release-truth-revalidation', 'Refresh release-truth surfaces after browser-proof repair with clean evidence', 'browser-validation'),
    ('preview-host-portability-hardening', 'Remove machine-specific preview host assumptions from phone testing', 'tooling'),
    ('registry-complete-selection-guard-hardening', 'Guard phase selection against registry-complete backlog ids', 'workflow'),
]

phase_map = {phase['id']: phase for phase in phases}
if phase_id not in phase_map:
    raise SystemExit(f'Unknown phase id: {phase_id}')

active = phase_map[phase_id]
deferred = [phase for phase in phases if phase['id'] != phase_id]

def quote(value: str) -> str:
    if any(ch in value for ch in [':', '`', '"', "'", '[', ']', '{', '}', '#']) or value.startswith('/'):
        return '"' + value.replace('"', '\\"') + '"'
    return value

lines = []
lines.append('selection_order:')
for item in selection_order:
    lines.append(f'  - {item}')
lines.append('')
lines.append('queue_rules:')
for item in queue_rules:
    lines.append(f'  - {quote(item)}')
lines.append('')
lines.append('constraints:')
lines.append(f"  max_files_changed: {constraints['max_files_changed']}")
lines.append(f"  prefer_single_module: {constraints['prefer_single_module']}")
lines.append(f"  avoid_generic_tasks: {constraints['avoid_generic_tasks']}")
lines.append('')

def emit_phase(section_name, phase_list):
    lines.append(f'{section_name}:')
    for phase in phase_list:
        lines.append(f"  - id: {phase['id']}")
        lines.append(f"    title: {quote(phase['title'])}")
        lines.append(f"    module: {phase['module']}")
        lines.append(f"    priority: {phase['priority']}")
        lines.append(f"    release_bump: {phase['release_bump']}")
        lines.append(f"    target_release: {phase['target_release']}")
        lines.append(f"    execution_flow: {quote(phase['execution_flow'])}")
        lines.append(f"    expected_max_files_changed: {phase['expected_max_files_changed']}")
        lines.append('    drivers:')
        for item in phase['drivers']:
            lines.append(f'      - {quote(item)}')
        lines.append('    files:')
        for item in phase['files']:
            lines.append(f'      - {item}')
        lines.append(f"    validation: {quote(phase['validation'])}")
        lines.append('    acceptance:')
        for item in phase['acceptance']:
            lines.append(f'      - {quote(item)}')
        lines.append('')
    if lines[-1] == '':
        lines.pop()
    lines.append('')

emit_phase('candidates', [active])
emit_phase('deferred_local_first_candidates', deferred)

lines.append('archived:')
for item_id, title, module in archived:
    lines.append(f'  - id: {item_id}')
    lines.append(f'    title: {quote(title)}')
    lines.append(f'    module: {module}')
    lines.append('    shipped: true')
    lines.append('')
if lines[-1] == '':
    lines.pop()
lines.append('')

path.write_text('\n'.join(lines))
PY

npm run workflow:check
