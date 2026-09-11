#!/usr/bin/env python3
"""Bump the package version by one semantic level.

Examples:
    python bump_version.py
    python bump_version.py --level patch
    python bump_version.py --dry-run
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SETUP_FILE = ROOT / "setup.py"
PLUGIN_FILE = ROOT / "octoprint_spirals" / "__init__.py"


def parse_version(version: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", version.strip())
    if not match:
        raise ValueError(f"Unsupported version format: {version!r}. Expected X.Y.Z")
    return tuple(int(part) for part in match.groups())


def bump_version(version: str, level: str) -> str:
    major, minor, patch = parse_version(version)

    if level == "major":
        major += 1
        minor = 0
        patch = 0
    elif level == "minor":
        minor += 1
        patch = 0
    elif level == "patch":
        patch += 1
    else:
        raise ValueError(f"Unsupported bump level: {level!r}. Use major, minor, or patch.")

    return f"{major}.{minor}.{patch}"


def replace_in_file(path: Path, pattern: str, replacement: str) -> None:
    text = path.read_text(encoding="utf-8")
    updated = re.sub(pattern, replacement, text, count=1)
    if updated == text:
        raise ValueError(f"Could not find pattern in {path.name}: {pattern!r}")
    path.write_text(updated, encoding="utf-8")


def update_versions(new_version: str, dry_run: bool = False) -> None:
    setup_text = SETUP_FILE.read_text(encoding="utf-8")
    setup_match = re.search(r'(version\s*=\s*["\'])((?:\d+\.){2}\d+)(["\'])', setup_text)
    if not setup_match:
        raise ValueError("Could not find a semantic version in setup.py")

    plugin_text = PLUGIN_FILE.read_text(encoding="utf-8")
    plugin_match = re.search(r'(__plugin_version__\s*=\s*["\'])((?:\d+\.){2}\d+)(["\'])', plugin_text)
    if not plugin_match:
        raise ValueError("Could not find __plugin_version__ in octoprint_spirals/__init__.py")

    if dry_run:
        print(f"Would bump version from {setup_match.group(2)} to {new_version}")
        return

    replace_in_file(SETUP_FILE, r'(version\s*=\s*["\'])((?:\d+\.){2}\d+)(["\'])', rf'\g<1>{new_version}\g<3>')
    replace_in_file(PLUGIN_FILE, r'(__plugin_version__\s*=\s*["\'])((?:\d+\.){2}\d+)(["\'])', rf'\g<1>{new_version}\g<3>')

    print(f"Updated version to {new_version}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bump the package version by one semantic level.")
    parser.add_argument("--level", choices=["major", "minor", "patch"], default="minor", help="Which version segment to bump")
    parser.add_argument("--dry-run", action="store_true", help="Show the new version without writing files")
    args = parser.parse_args()

    setup_text = SETUP_FILE.read_text(encoding="utf-8")
    match = re.search(r'version\s*=\s*["\']((?:\d+\.){2}\d+)["\']', setup_text)
    if not match:
        raise ValueError("Could not find a semantic version in setup.py")

    current_version = match.group(1)
    new_version = bump_version(current_version, args.level)
    update_versions(new_version, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
