#!/usr/bin/env python3
"""
Transform newspaper/book citation blockquotes from the start of markdown files
to APA-style references at the end of the body text, wrapped in a VuePress
component that provides a copy-to-clipboard button.

Input patterns (at the top of the file body, right after frontmatter):
  > 《華僑日報》，1990年11月25日，頁11。
  > 《工商晚報》，1931年8月1日，第3版。
  > 《工商日報》，1930年8月22日，第3張第1頁。
  > 《大公報》，1963年12月7日，第1張；第3版。
  > 《盧制軍香港大學堂笫弍次勸捐啓》（1910年）。
  > 《港督盧制軍香港大學堂勸捐啟譯文並序》（香港：中環和盛印字館，1909年2月）。
  > 《華僑日報》，1965年3月27日，第4張第2頁。
  >
  > 按：僅摘錄與《古物及古蹟條例》法案相關原文，餘者從略。

Output: The citation is removed from the top and appended at the end of the
body text in APA format, wrapped in a <ReferenceBox> component.
"""

import os
import re
import sys
from pathlib import Path

SRC_DIR = Path(__file__).parent.parent / "src"


def convert_to_apa(citation_text: str) -> str:
    """Convert a Chinese citation to APA 7th edition format (Chinese).

    APA format for newspaper articles (no article title available):
      報紙名稱。（年份，月分，日）。頁碼。

    For books:
      書名（出版資訊）。
    """
    text = citation_text.strip().rstrip("。.")

    # Book patterns:
    # > 《書名》（年份）。
    # > 《書名》（出版地：出版社，年份月）。
    book_match = re.match(
        r'^《(.+?)》\s*[（(]\s*(.+?)\s*[）)]\s*[。.]?\s*$',
        text,
    )
    if book_match:
        title = book_match.group(1)
        pub_info = book_match.group(2)
        return f"{title}（{pub_info}）。"

    # Try newspaper pattern: 《報紙名》，YYYY年MM月DD日，頁碼。
    newspaper_match = re.match(
        r'^《(.+?)》\s*[，,]\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*[，,]\s*(.+?)\s*[。.]?\s*$',
        text,
    )
    if newspaper_match:
        newspaper = newspaper_match.group(1)
        year = newspaper_match.group(2)
        month = newspaper_match.group(3)
        day = newspaper_match.group(4)
        page_info = newspaper_match.group(5)

        return f"{newspaper}。（{year}，{month}月{day}日）。{page_info}。"

    # Try newspaper pattern with year/month only: 《報紙名》，YYYY年MM月，頁碼。
    newspaper_month_match = re.match(
        r'^《(.+?)》\s*[，,]\s*(\d{4})年(\d{1,2})月\s*[，,]\s*(.+?)\s*[。.]?\s*$',
        text,
    )
    if newspaper_month_match:
        newspaper = newspaper_month_match.group(1)
        year = newspaper_month_match.group(2)
        month = newspaper_month_match.group(3)
        page_info = newspaper_month_match.group(4)

        return f"{newspaper}。（{year}，{month}月）。{page_info}。"

    # Fallback: return as-is
    return text


def extract_citation_block(lines: list[str]) -> tuple[list[str], str | None]:
    """Extract the citation blockquote from the beginning of the body.

    Returns (remaining_lines, citation_text) where citation_text is the
    full citation (without the > prefix) or None if no citation found.
    """
    # Skip frontmatter
    in_frontmatter = False
    frontmatter_end = 0
    body_start = 0

    for i, line in enumerate(lines):
        if i == 0 and line.strip() == "---":
            in_frontmatter = True
            continue
        if in_frontmatter:
            if line.strip() == "---":
                in_frontmatter = False
                frontmatter_end = i + 1
                body_start = i + 1
                break

    if in_frontmatter:
        # Malformed frontmatter
        return lines, None

    # Find the citation block: consecutive lines starting with > at the start of body
    # Skip leading blank lines
    citation_lines: list[str] = []
    citation_start = -1
    citation_end = -1
    i = body_start

    # Skip blank lines before citation
    while i < len(lines) and lines[i].strip() == "":
        i += 1

    if i < len(lines) and lines[i].strip().startswith(">"):
        citation_start = i
        while i < len(lines) and lines[i].strip().startswith(">"):
            citation_lines.append(lines[i])
            i += 1
        citation_end = i

        # Skip trailing blank lines after citation
        while i < len(lines) and lines[i].strip() == "":
            i += 1

        # Remove the citation block and trailing blanks from lines
        remaining = lines[:citation_start] + lines[citation_end:]
        # But keep one blank line after frontmatter
        # Clean up: ensure there's proper spacing

        citation_text = "\n".join(citation_lines)
        return remaining, citation_text

    return lines, None


def parse_citation_block(citation_text: str) -> tuple[str, str | None]:
    """Parse a citation blockquote into (citation_line, note_line).

    The block may contain:
      > 《...》...。
      >
      > 按：...
    """
    lines = citation_text.strip().split("\n")

    citation_line = ""
    note_line = None

    for line in lines:
        stripped = line.strip()
        if stripped.startswith(">"):
            content = stripped[1:].strip()
            if content.startswith("按"):
                note_line = content
            elif content:
                if citation_line:
                    citation_line += " " + content
                else:
                    citation_line = content

    return citation_line, note_line


def build_reference_component(apa_text: str, note: str | None, doc_title: str) -> str:
    """Build the VuePress component for the reference with copy button."""
    # Build the reference text
    parts = [apa_text]
    if note:
        parts.append(note)

    reference_content = "\n\n".join(parts)

    return f"""

<ReferenceBox>

{reference_content}

</ReferenceBox>
"""


def process_file(filepath: Path) -> bool:
    """Process a single markdown file.

    Returns True if the file was modified, False otherwise.
    """
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  Error reading {filepath}: {e}", file=sys.stderr)
        return False

    lines = content.split("\n")

    # Extract citation block
    remaining_lines, citation_text = extract_citation_block(lines)

    if citation_text is None:
        return False

    # Parse citation
    citation_line, note_line = parse_citation_block(citation_text)

    if not citation_line:
        return False

    # Convert to APA
    apa_text = convert_to_apa(citation_line)

    # Get document title from frontmatter
    doc_title = ""
    in_frontmatter = False
    for line in lines:
        if line.strip() == "---":
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                break
        if in_frontmatter and line.strip().startswith("title:"):
            doc_title = line.split(":", 1)[1].strip().strip('"').strip("'")
            break

    # Build reference component
    ref_component = build_reference_component(apa_text, note_line, doc_title)

    # Find the end of the body content (skip trailing whitespace lines)
    # We need to append the reference at the end of the remaining content
    # Remove trailing empty lines from remaining_lines
    while remaining_lines and remaining_lines[-1].strip() == "":
        remaining_lines.pop()

    # Also clean up leading empty lines (but keep proper frontmatter separation)
    # Find where frontmatter ends
    fm_end = 0
    in_fm = False
    for i, line in enumerate(remaining_lines):
        if i == 0 and line.strip() == "---":
            in_fm = True
            continue
        if in_fm and line.strip() == "---":
            fm_end = i + 1
            break

    # Ensure there's exactly one blank line after frontmatter
    # and before body content
    if fm_end > 0:
        # Count blank lines after frontmatter
        j = fm_end
        while j < len(remaining_lines) and remaining_lines[j].strip() == "":
            j += 1
        # Reconstruct with proper spacing
        new_lines = remaining_lines[:fm_end]
        if j < len(remaining_lines):
            new_lines.append("")  # One blank line after frontmatter
            new_lines.extend(remaining_lines[j:])
        remaining_lines = new_lines

    # Append the reference component before any footnotes (lines starting with [^N]:)
    # Find the first footnote line
    footnote_start = None
    for i, line in enumerate(remaining_lines):
        if re.match(r'^\[\^\d+\]:', line):
            footnote_start = i
            break

    if footnote_start is not None:
        # Remove trailing empty lines before footnotes
        body_end = footnote_start
        while body_end > 0 and remaining_lines[body_end - 1].strip() == "":
            body_end -= 1
        # Reconstruct: body + reference component + blank lines + footnotes
        body_lines = remaining_lines[:body_end]
        footnote_lines = remaining_lines[footnote_start:]
        # Clean trailing empty lines from body
        while body_lines and body_lines[-1].strip() == "":
            body_lines.pop()
        result = "\n".join(body_lines) + ref_component + "\n\n" + "\n".join(footnote_lines)
    else:
        # No footnotes: just append at the end
        result = "\n".join(remaining_lines) + ref_component

    # Ensure file ends with newline
    if not result.endswith("\n"):
        result += "\n"

    # Write back
    try:
        filepath.write_text(result, encoding="utf-8")
        return True
    except Exception as e:
        print(f"  Error writing {filepath}: {e}", file=sys.stderr)
        return False


def main():
    """Main entry point."""
    if not SRC_DIR.exists():
        print(f"Source directory not found: {SRC_DIR}", file=sys.stderr)
        sys.exit(1)

    # Find all markdown files
    md_files = sorted(SRC_DIR.rglob("*.md"))
    modified_count = 0

    for filepath in md_files:
        # Skip README.md and other non-article files
        if filepath.name in ("README.md", "about.md", "reading-notes.md", "support.md"):
            continue

        old_content = filepath.read_text(encoding="utf-8")

        # Quick check: does it have a citation block?
        if not re.search(r'^> 《', old_content, re.MULTILINE):
            continue

        if process_file(filepath):
            modified_count += 1
            print(f"  ✓ {filepath.relative_to(SRC_DIR)}")

    print(f"\nDone! Modified {modified_count} files.")


if __name__ == "__main__":
    main()
