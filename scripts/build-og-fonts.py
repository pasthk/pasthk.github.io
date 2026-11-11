
import glob
import json
import os
import sys

from fontTools.merge import Merger
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_ROOT = os.path.join(ROOT, "node_modules", "@fontsource")
FONT_OUT = os.path.join(ROOT, "src", ".vuepress", "og", "fonts")
TMP = os.path.join(ROOT, ".workbuddy-ai", "tmp")

WEIGHTS = ("700", "400")

PRIMARY = (
    ("noto-serif-tc", "chinese-traditional"),
    ("noto-serif-sc", "chinese-simplified"),
)

FIXED_TEXT = (
    "香港文獻類編認識，從文獻開始www.pasthk.com"
    "Hong Kong Documents"
    "Thematic Compilation of Hong Kong Archives"
    "1890–1990 年代香港舊報紙與歷史文獻索引"
    "香港歷史文獻索引"
    "找不到頁面404 Not Found收錄篇"
    "香港考古傳統節慶與打醮教育史歷史建築法例專題研究公共衛生碑刻熱帶氣旋與風球醫院"
)

PUNCTUATION = (
    "—–·…「」『』、。，．：；！？（）【】《》〈〉〔〕"
    "－％＃＆＊＋／＝＂＇"
)


def collect_chars() -> set:
    chars = set(FIXED_TEXT) | set(PUNCTUATION)
    chars |= {chr(code) for code in range(0x20, 0x7F)}

    scanned = 0
    for path in glob.glob(os.path.join(ROOT, "src", "**", "*.md"), recursive=True):
        if os.sep + ".vuepress" + os.sep in path:
            continue

        with open(path, encoding="utf-8") as handle:
            chars |= set(handle.read())

        scanned += 1

    print(f"  掃描 {scanned} 個 Markdown 檔")

    return chars


def to_ttf(package: str, subset: str, weight: str) -> str | None:
    src = os.path.join(
        FONT_ROOT, package, "files", f"{package}-{subset}-{weight}-normal.woff2"
    )

    if not os.path.exists(src):
        return None

    dst = os.path.join(TMP, f"merge-{package}-{subset}-{weight}.ttf")
    os.makedirs(TMP, exist_ok=True)

    font = TTFont(src)
    font.flavor = None
    font.save(dst)

    return dst


def unicode_ranges(spec: str) -> list[tuple[int, int]]:
    ranges = []

    for part in spec.split(","):
        part = part.strip()

        if not part.startswith("U+"):
            continue

        body = part[2:]

        if "-" in body:
            low, high = body.split("-")
            ranges.append((int(low, 16), int(high, 16)))
        else:
            value = int(body, 16)
            ranges.append((value, value))

    return ranges


def subsets_covering(char: str, table: dict) -> list[str]:
    cp = ord(char)
    hits = []

    for key, spec in table.items():
        if any(low <= cp <= high for low, high in unicode_ranges(spec)):
            hits.append(key)

    return hits


def build_weight(weight: str, chars: set) -> TTFont:
    paths = []

    for package, subset in PRIMARY:
        path = to_ttf(package, subset, weight)

        if path is None:
            sys.exit(
                f"找不到主檔：{package}/{subset}\n"
                "請先執行 npm i -D @fontsource/noto-serif-tc @fontsource/noto-serif-sc"
            )

        paths.append(path)

    merged = Merger().merge(paths)
    cmap = merged.getBestCmap()
    missing = sorted(c for c in chars if c.strip() and ord(c) not in cmap)

    print(f"  {weight}: 主檔缺 {len(missing)} 字，從子集補齊")

    table = json.load(
        open(os.path.join(FONT_ROOT, "noto-serif-tc", "unicode.json"), encoding="utf-8")
    )
    needed: set[str] = set()

    for char in missing:
        needed.update(subsets_covering(char, table))

    extra_paths = []

    for subset in sorted(needed):
        path = to_ttf("noto-serif-tc", subset.strip("[]"), weight)

        if path:
            extra_paths.append(path)

    if extra_paths:
        merged = Merger().merge([*paths, *extra_paths])
        cmap = merged.getBestCmap()
        still = [c for c in missing if ord(c) not in cmap]

        if still:
            print(f"    仍缺 {len(still)} 字：{''.join(still)}")

    options = Options()
    options.layout_features = []
    options.name_IDs = ["*"]
    options.notdef_outline = True

    subsetter = Subsetter(options=options)
    subsetter.populate(text="".join(sorted(chars)))
    subsetter.subset(merged)

    for path in [*paths, *extra_paths]:
        try:
            os.remove(path)
        except OSError:
            pass

    return merged


def main() -> None:
    chars = collect_chars()
    cjk = [char for char in chars if ord(char) > 0x2E80]
    print(f"字元集合：{len(chars)} 個（其中 CJK {len(cjk)} 個）")

    os.makedirs(FONT_OUT, exist_ok=True)

    coverage: list[int] = []

    for weight in WEIGHTS:
        font = build_weight(weight, chars)
        font.flavor = None
        dst = os.path.join(FONT_OUT, f"noto-serif-tc-{weight}.ttf")
        font.save(dst)
        coverage = sorted(font.getBestCmap())
        print(f"    {os.path.getsize(dst) // 1024} KB → {dst}")

    with open(os.path.join(FONT_OUT, "coverage.json"), "w", encoding="utf-8") as handle:
        json.dump(coverage, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")

    print(f"    覆蓋 {len(coverage)} 個碼位 → coverage.json")
    print("完成")


if __name__ == "__main__":
    main()
