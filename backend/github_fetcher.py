from __future__ import annotations
import re
import base64
import httpx

MAX_FILE_CHARS = 30_000   # per file
MAX_TOTAL_CHARS = 80_000  # total injected content cap
MAX_FILES = 20            # max source files to fetch for a repo URL

# File extensions worth fetching for code review
CODE_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.java', '.rb',
    '.php', '.cs', '.cpp', '.c', '.h', '.swift', '.kt', '.scala',
    '.sol', '.sh', '.bash', '.sql', '.html', '.css', '.scss',
    '.json', '.yaml', '.yml', '.toml', '.md',
}

# Filenames to always skip (lock files are huge and add no signal)
SKIP_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
    'poetry.lock', 'Pipfile.lock', 'Gemfile.lock', 'Cargo.lock',
}

# Directories to skip when walking a repo tree
SKIP_DIRS = {
    'node_modules', '__pycache__', '.git', 'dist', 'build', '.next',
    'coverage', '.pytest_cache', 'venv', '.venv', 'vendor', 'storybook-static',
}

# Entry-point filenames fetched first, in priority order.
# Covers common conventions across languages/frameworks.
PRIORITY_FILENAMES = [
    'README.md',
    # JS / TS
    'src/main.tsx', 'src/main.ts', 'src/index.tsx', 'src/index.ts',
    'src/App.tsx', 'src/App.ts', 'src/app.tsx', 'src/app.ts',
    'main.tsx', 'main.ts', 'index.tsx', 'index.ts', 'index.js', 'index.jsx',
    'App.tsx', 'App.ts',
    # Python
    'main.py', 'app.py', 'server.py', '__init__.py',
    # Go
    'main.go', 'cmd/main.go',
    # Rust
    'src/main.rs', 'src/lib.rs',
    # Java / Kotlin / Scala
    'build.gradle', 'build.gradle.kts', 'pom.xml',
    # C / C++
    'main.c', 'main.cpp', 'CMakeLists.txt',
    # Ruby
    'Gemfile', 'app/controllers/application_controller.rb',
    # PHP
    'index.php', 'composer.json',
    # Solidity
    'src/DeadDrop.sol',
    # Manifests / lockfile-free dependency files
    'package.json', 'requirements.txt', 'pyproject.toml',
    'Cargo.toml', 'go.mod', 'go.sum',
    # Common config
    'tsconfig.json', 'vite.config.ts', 'vite.config.js',
    'next.config.ts', 'next.config.js',
]

_GH_HEADERS = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
}


def _parse_github_url(url: str) -> dict | None:
    """Return a dict describing the GitHub URL type, or None if not GitHub."""
    url = url.strip().rstrip('/')

    m = re.search(r'github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)', url)
    if m:
        return {'type': 'file', 'owner': m.group(1), 'repo': m.group(2),
                'branch': m.group(3), 'path': m.group(4)}

    m = re.search(r'github\.com/([^/]+)/([^/]+)/pull/(\d+)', url)
    if m:
        return {'type': 'pr', 'owner': m.group(1), 'repo': m.group(2),
                'number': m.group(3)}

    m = re.search(r'github\.com/([^/]+)/([^/]+?)(?:\.git)?$', url)
    if m:
        return {'type': 'repo', 'owner': m.group(1), 'repo': m.group(2)}

    return None


def _should_include(path: str) -> bool:
    parts = path.split('/')
    filename = parts[-1]

    if filename in SKIP_FILES:
        return False
    if any(p in SKIP_DIRS for p in parts[:-1]):
        return False

    # Skip test files — they add noise and consume budget without helping evaluation
    if any(seg in filename for seg in ('.test.', '.spec.', '.stories.')):
        return False
    if len(parts) > 1 and parts[-2] in ('__tests__', '__mocks__', 'fixtures', 'mocks'):
        return False

    ext = ('.' + filename.rsplit('.', 1)[-1].lower()) if '.' in filename else ''
    return ext in CODE_EXTENSIONS


_SOURCE_EXTS = {
    '.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.java', '.rb',
    '.php', '.cs', '.cpp', '.c', '.h', '.swift', '.kt', '.scala', '.sol',
}
_STYLE_EXTS = {'.css', '.scss', '.html'}


def _file_score(path: str) -> int:
    """
    Lower score = fetched first.
    Ranks by (category, depth) so shallower source files beat deeper ones,
    and source always beats styles which always beats config.
    No framework-specific directory names — works for any language.
    """
    parts = path.split('/')
    depth = len(parts)
    ext = ('.' + parts[-1].rsplit('.', 1)[-1].lower()) if '.' in parts[-1] else ''

    if ext in _SOURCE_EXTS:
        return depth          # e.g. src/main.go → 2, src/pkg/util.go → 3
    if ext in _STYLE_EXTS:
        return 100 + depth    # styles after all source
    return 200 + depth        # config/manifest last


async def _get_file(client: httpx.AsyncClient, owner: str, repo: str,
                    path: str, ref: str = 'HEAD') -> str | None:
    params = {} if ref == 'HEAD' else {'ref': ref}
    resp = await client.get(
        f'https://api.github.com/repos/{owner}/{repo}/contents/{path}',
        params=params,
    )
    if resp.status_code != 200:
        return None
    data = resp.json()
    if data.get('encoding') == 'base64' and data.get('content'):
        try:
            return base64.b64decode(data['content']).decode('utf-8', errors='replace')[:MAX_FILE_CHARS]
        except Exception:
            return None
    return None


async def fetch_github_content(url: str) -> str | None:
    """
    Fetch code content from a GitHub URL for use in deliverable evaluation.
    Returns a formatted string ready to inject into the prompt, or None if
    the URL is not a recognised GitHub URL or the fetch fails.
    """
    parsed = _parse_github_url(url)
    if not parsed:
        return None

    async with httpx.AsyncClient(headers=_GH_HEADERS, timeout=20.0) as client:
        if parsed['type'] == 'file':
            content = await _get_file(client, parsed['owner'], parsed['repo'],
                                      parsed['path'], parsed['branch'])
            if content is None:
                return None
            return f"=== FILE: {parsed['path']} ===\n{content}"

        if parsed['type'] == 'pr':
            owner, repo, number = parsed['owner'], parsed['repo'], parsed['number']

            pr_resp = await client.get(
                f'https://api.github.com/repos/{owner}/{repo}/pulls/{number}'
            )
            if pr_resp.status_code != 200:
                return None
            pr = pr_resp.json()

            diff_resp = await client.get(
                f'https://api.github.com/repos/{owner}/{repo}/pulls/{number}',
                headers={**_GH_HEADERS, 'Accept': 'application/vnd.github.diff'},
            )

            parts = [
                f"=== PULL REQUEST #{number}: {pr.get('title', '')} ===",
                f"State: {pr.get('state', '')} | "
                f"+{pr.get('additions', 0)} -{pr.get('deletions', 0)} lines "
                f"across {pr.get('changed_files', 0)} files",
                f"\nDescription:\n{pr.get('body') or '(no description)'}",
            ]
            if diff_resp.status_code == 200:
                parts.append(f"\nDiff:\n{diff_resp.text[:MAX_FILE_CHARS]}")

            return '\n'.join(parts)

        if parsed['type'] == 'repo':
            owner, repo = parsed['owner'], parsed['repo']
            sections: list[str] = []
            total_chars = 0

            # README
            readme_resp = await client.get(
                f'https://api.github.com/repos/{owner}/{repo}/readme'
            )
            if readme_resp.status_code == 200:
                data = readme_resp.json()
                if data.get('encoding') == 'base64' and data.get('content'):
                    readme = base64.b64decode(data['content']).decode('utf-8', errors='replace')[:5000]
                    sections.append(f"=== README ===\n{readme}")
                    total_chars += len(readme)

            # File tree
            tree_resp = await client.get(
                f'https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1'
            )
            if tree_resp.status_code != 200:
                return '\n\n'.join(sections) or None

            all_files = [
                item['path'] for item in tree_resp.json().get('tree', [])
                if item['type'] == 'blob' and _should_include(item['path'])
            ]

            sections.append("=== FILE TREE ===\n" + '\n'.join(all_files[:150]))

            # Build fetch order: explicit priority filenames first, then remaining
            # files sorted by _file_score so source code beats config beats styles.
            fetched_set: set[str] = set()
            fetch_order: list[str] = []
            for p in PRIORITY_FILENAMES:
                matched = [f for f in all_files if f == p or f.endswith('/' + p)]
                for f in matched:
                    if f not in fetched_set:
                        fetch_order.append(f)
                        fetched_set.add(f)
            remaining = sorted(
                (f for f in all_files if f not in fetched_set),
                key=_file_score,
            )
            fetch_order.extend(remaining)

            fetched = 0
            for path in fetch_order:
                if fetched >= MAX_FILES or total_chars >= MAX_TOTAL_CHARS:
                    break
                content = await _get_file(client, owner, repo, path)
                if content:
                    section = f"=== FILE: {path} ===\n{content}"
                    sections.append(section)
                    total_chars += len(section)
                    fetched += 1

            return '\n\n'.join(sections) if sections else None

    return None
