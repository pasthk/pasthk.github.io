#!/usr/bin/env python3
"""
Update the content inside <ReferenceBox> tags in all markdown files.

The previous content was an APA-style citation of the original source
(e.g. "華僑日報。（1990，11月25日）。頁11。").

This script converts that content into a "文獻出處" label format,
since the APA citation of the current webpage is now generated
dynamically by the ReferenceBox Vue component.

Example transformation:
  Before:
    <ReferenceBox>

    華僑日報。（1990，11月25日）。頁11。

    </ReferenceBox>

  After:
    <ReferenceBox>

    文獻出處：華僑日報，1990年11月25日，頁11。

    </ReferenceBox>
"""

import re
import sys
from pathlib import Path

SRC_DIR = Path(__file__).parent.parent / "src"


def revert_apa_to_source(text: str) -> str:
    """Convert APA format back to source citation format.

    APA: 華僑日報。（1990，11月25日）。頁11。
    Source: 華僑日報，1990年11月25日，頁11。

    APA for books: 盧制軍香港大學堂笫弍次勸捐啓（1910年）。
    Source (books): keep as-is, just prefix with "文獻出處："
    """
    text = text.strip().rstrip("。")

    # Try newspaper APA: 報紙名。（年份，月分日）。頁碼。
    m = re.match(
        r'^(.+?)。（(\d{4})，(\d{1,2})月(\d{1,2})日）[。.]?(.*)$',
        text,
    )
    if m:
        newspaper = m.group(1)
        year = m.group(2)
        month = m.group(3)
        day = m.group(4)
        page = m.group(5).strip().rstrip("。")
        result = f"{newspaper}，{year}年{month}月{day}日"
        if page:
            result += f"，{page}"
        return f"文獻出處：{result}。"

    # Try newspaper APA with year/month only: 報紙名。（年份，月分）。頁碼。
    m = re.match(
        r'^(.+?)。（(\d{4})，(\d{1,2})月）[。.]?(.*)$',
        text,
    )
    if m:
        newspaper = m.group(1)
        year = m.group(2)
        month = m.group(3)
        page = m.group(4).strip().rstrip("。")
        result = f"{newspaper}，{year}年{month}月"
        if page:
            result += f"，{page}"
        return f"文獻出處：{result}。"

    # Book pattern: 書名（出版資訊）。
    m = re.match(
        r'^《(.+?)》\s*[（(]\s*(.+?)\s*[）)]\s*[。.]?\s*$',
        text,
    )
    if m:
        title = m.group(1)
        pub_info = m.group(2)
        return f"文獻出處：《{title}》（{pub_info}）。"

    # Fallback: just prefix
    return f"文獻出處：{text}。"


def process_file(filepath: Path) -> bool:
    """Process a single markdown file."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  Error reading {filepath}: {e}", file=sys.stderr)
        return False

    # Find <ReferenceBox>...</ReferenceBox> blocks
    pattern = re.compile(
        r'<ReferenceBox>\s*\n(.*?)\n\s*</ReferenceBox>',
        re.DOTALL,
    )

    def replace_block(match):
        inner = match.group(1).strip()
        lines = inner.split("\n")

        # Separate citation line from note line (按：...)
        citation_line = ""
        note_line = None

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("按"):
                note_line = stripped
            elif stripped:
                if citation_line:
                    citation_line += " " + stripped
                else:
                    citation_line = stripped

        if not citation_line:
            return match.group(0)

        # If already in source format (starts with 文獻出處：), skip
        if citation_line.startswith("文獻出處："):
            return match.group(0)

        # Convert APA back to source format
        source_text = revert_apa_to_source(citation_line)

        # Build new content
        parts = [source_text]
        if note_line:
            parts.append(note_line)

        new_inner = "\n\n".join(parts)
        return f"<ReferenceBox>\n\n{new_inner}\n\n</ReferenceBox>"

    new_content = pattern.sub(replace_block, content)

    if new_content == content:
        return False

    try:
        filepath.write_text(new_content, encoding="utf-8")
        return True
    except Exception as e:
        print(f"  Error writing {filepath}: {e}", file=sys.stderr)
        return False


def main():
    if not SRC_DIR.exists():
        print(f"Source directory not found: {SRC_DIR}", file=sys.stderr)
        sys.exit(1)

    md_files = sorted(SRC_DIR.rglob("*.md"))
    modified_count = 0

    for filepath in md_files:
        if filepath.name in ("README.md", "about.md", "reading-notes.md", "support.md"):
            continue

        content = filepath.read_text(encoding="utf-8")
        if "<ReferenceBox>" not in content:
            continue

        if process_file(filepath):
            modified_count += 1
            print(f"  ✓ {filepath.relative_to(SRC_DIR)}")

    print(f"\nDone! Modified {modified_count} files.")


if __name__ == "__main__":
    main()
