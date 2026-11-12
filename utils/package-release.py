"""Build the installable Immortals Legacy release using the current native packs."""

import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUNTIME_DIRS = ("assets", "fonts", "icons", "json", "lang", "less", "module", "templates", "ui")
RUNTIME_FILES = ("README.md", "dnd5e.mjs", "dnd5e.css", "system.json")
DATABASE_METADATA = {"LOCK", "LOG", "LOG.old"}


def inside_project(relative):
    target = (ROOT / relative).resolve()
    if not target.is_relative_to(ROOT):
        raise ValueError(f"Path outside the project: {relative}")
    return target


def build(tag=None):
    manifest = json.loads((ROOT / "system.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        raise ValueError("Use a numeric major.minor.patch release version")
    if tag is not None and tag != f"v{version}":
        raise ValueError(f"Tag {tag} does not match system.json version {version}")
    repository = "https://github.com/kaavitorr/Immortals-system"
    expected_download = f"{repository}/releases/download/v{version}/immortals-system.zip"
    if manifest.get("download") != expected_download:
        raise ValueError(f"Set download to {expected_download}")
    if manifest.get("manifest") != f"{repository}/releases/latest/download/system.json":
        raise ValueError("Unexpected manifest URL")

    files = {inside_project(name) for name in RUNTIME_FILES}
    for directory in RUNTIME_DIRS:
        folder = inside_project(directory)
        if not folder.is_dir():
            raise FileNotFoundError(folder)
        files.update(p for p in folder.rglob("*") if p.is_file())
    for language in manifest.get("languages", []):
        files.add(inside_project(language["path"]))
    for entrypoint in manifest.get("esmodules", []) + manifest.get("styles", []):
        files.add(inside_project(entrypoint))
    for pack in manifest.get("packs", []):
        folder = inside_project(pack["path"])
        current = folder / "CURRENT"
        if not current.is_file():
            raise FileNotFoundError(f"Native compendium missing: {pack['name']}")
        active_manifest = current.read_text(encoding="utf-8").strip()
        if not (folder / active_manifest).is_file():
            raise FileNotFoundError(f"LevelDB manifest missing: {pack['name']}")
        files.update(p for p in folder.iterdir() if p.is_file() and p.name not in DATABASE_METADATA)
    for file in files:
        if not file.is_file():
            raise FileNotFoundError(f"Build the required asset before packaging: {file}")
        if file.is_symlink() or not file.resolve().is_relative_to(ROOT):
            raise ValueError(f"Release asset outside the project: {file}")

    destination = ROOT / "dist"
    destination.mkdir(exist_ok=True)
    archive = destination / "immortals-system.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as package:
        for file in sorted(files):
            package.write(file, file.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as package:
        invalid = package.testzip()
        if invalid:
            raise ValueError(f"Invalid ZIP entry: {invalid}")
    (destination / "system.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Immortals Legacy {version}: {len(files)} files, {archive.stat().st_size:,} bytes")
    print(archive)


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else None)
