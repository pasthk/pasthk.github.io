#!/usr/bin/env python3
"""產生 OG 卡片用的字型子集。

Noto Serif TC／SC 以 SIL Open Font License 1.1 釋出，可自由使用與散布。
這裡把字型裁成「本站實際用到的字元」，存成 TTF 供建置時使用。

用途：建置時由 fontkit 讀入，把卡片上的每一段文字轉成 SVG <path>。
轉成路徑後，輸出檔不含任何 <text>，因此不需要字型也能在任何裝置、
任何平台上正確顯示——社群平台抓取時不會再出現亂碼或方框。

為什麼要合併多個來源檔：@fontsource 把字型依 unicode-range 切成近百個子集。
繁體主檔（chinese-traditional）只有常用漢字，缺全角標點；
簡體主檔（chinese-simplified）補齊簡體字與標點；
少數異體字（攷、窰、衞……）又散落在編號子集裡。
因此流程是：先合併主檔 → 找出仍缺的字 → 從對應子集補齊 → 最後裁切。

用法：
    python3 scripts/build-og-fonts.py

前置：
    npm i -D @fontsource/noto-serif-tc @fontsource/noto-serif-sc
"""

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

# 主檔：繁體優先，簡體補齊。順序即優先順序。
PRIMARY = (
    ("noto-serif-tc", "chinese-traditional"),
    ("noto-serif-sc", "chinese-simplified"),
)

# 卡片固定文案。即使全站 Markdown 掃描有遺漏也能涵蓋。
FIXED_TEXT = (
    "香港文獻類編認識，從文獻開始www.pasthk.com"
    "Hong Kong Documents"
    "Thematic Compilation of Hong Kong Archives"
    "1890–1990 年代香港舊報紙與歷史文獻索引"
    "找不到頁面404 Not Found收錄篇"
    "香港考古傳統節慶與打醮教育史歷史建築法例專題研究公共衛生碑刻熱帶氣旋與風球"
)

PUNCTUATION = (
    "—–·…「」『』、。，．：；！？（）【】《》〈〉〔〕"
    "－％＃＆＊＋／＝＂＇"
)


def collect_chars() -> set:
    """收集所有可能出現在 OG 卡片上的字元。

    卡片文字來源是 page.title 與 meta（ReferenceBox、description 首句），
    兩者都可能包含任意漢字，因此掃描全站 Markdown 取聯集，
    不能只依賴已建置的 SVG（那會漏掉換標題後才出現的字）。
    """
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
    """把 woff2 子集轉成暫存 TTF（Merger 只吃未壓縮的 TrueType）。"""
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
    """找出哪個編號子集包含這個字元。"""
    cp = ord(char)
    hits = []

    for key, spec in table.items():
        if any(low <= cp <= high for low, high in unicode_ranges(spec)):
            hits.append(key)

    return hits


def build_weight(weight: str, chars: set) -> TTFont:
    """合併主檔，補齊缺字，最後裁切到 chars。"""
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

    # 依 unicode.json 找出需要的子集，一次補齊。
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

    # 裁切到實際用到的字元
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

    for weight in WEIGHTS:
        font = build_weight(weight, chars)
        font.flavor = None
        dst = os.path.join(FONT_OUT, f"noto-serif-tc-{weight}.ttf")
        font.save(dst)
        print(f"    {os.path.getsize(dst) // 1024} KB → {dst}")

    print("完成")


if __name__ == "__main__":
    main()
