#!/usr/bin/env python3
"""產生 OG 卡片用的字型子集。

Noto Serif TC 以 SIL Open Font License 1.1 釋出，可自由使用與散布。
這裡把字型裁成「本站實際用到的字元」，大幅縮小體積後存成 TTF。

為什麼是 TTF 而不是 woff2：librsvg 2.63（sharp 內建的 SVG 渲染器）
不支援 woff2 的 data URI，遇到時會讓整張圖只剩少數文字。
TTF 格式則可正常內嵌並渲染。

用法：
    python3 scripts/build-og-fonts.py

前置：npm i -D @fontsource/noto-serif-tc
"""

import glob
import os
import re
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_SOURCE = os.path.join(
    ROOT, "node_modules", "@fontsource", "noto-serif-tc", "files"
)
FONT_OUT = os.path.join(ROOT, "src", ".vuepress", "og", "fonts")

# 兩種字重：標題與刊頭用 Bold，其餘用 Regular。
WEIGHTS = {"700": "700", "400": "400"}

# 卡片固定文案。即使沒有已建置的 SVG 也能涵蓋。
FIXED_TEXT = (
    "香港文獻類編認識，從文獻開始www.pasthk.com"
    "Hong Kong Documents"
    "1890–1990 年代香港舊報紙與歷史文獻索引"
    "找不到頁面404 Not Found收錄篇"
    "考古傳統節慶與打醮教育史歷史建築法例專題研究公共衛生碑刻熱帶氣旋風球"
    " ··…–—"
)

PUNCTUATION = "—–·…「」『』、。，．：；！？（）【】《》"


def collect_chars() -> set:
    """收集所有 OG 卡片會用到的字元。

    優先從已建置的 SVG 取得實際用字；若找不到（首次建置），
    則退回掃描全站 Markdown，範圍較廣但結果一樣正確。
    """
    chars = set(FIXED_TEXT) | set(PUNCTUATION)
    chars |= set(chr(code) for code in range(0x20, 0x7F))

    built = sorted(glob.glob(os.path.join(ROOT, "src", ".vuepress", "og", "*.svg")))
    built += sorted(
        glob.glob(os.path.join(ROOT, ".workbuddy-ai", "tmp", "*", "og", "*.svg"))
    )

    if built:
        for path in built:
            with open(path, encoding="utf-8") as handle:
                svg = handle.read()

            for match in re.finditer(r">([^<>]+)</(?:text|tspan|title)>", svg):
                chars |= set(match.group(1))
    else:
        for path in glob.glob(os.path.join(ROOT, "src", "**", "*.md"), recursive=True):
            if os.sep + ".vuepress" + os.sep in path:
                continue

            with open(path, encoding="utf-8") as handle:
                chars |= set(handle.read())

    return chars


def subset_font(weight: str, text: str) -> None:
    src = os.path.join(
        FONT_SOURCE, f"noto-serif-tc-chinese-traditional-{weight}-normal.woff2"
    )
    dst = os.path.join(FONT_OUT, f"noto-serif-tc-{weight}.ttf")

    if not os.path.exists(src):
        sys.exit(f"找不到來源字型：{src}\n請先執行 npm i -D @fontsource/noto-serif-tc")

    font = TTFont(src)
    options = Options()
    options.layout_features = []
    options.name_IDs = ["*"]
    options.notdef_outline = True

    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)

    # flavor=None 表示輸出 TrueType（.ttf），而非保留 woff2 壓縮。
    font.flavor = None
    font.save(dst)

    size = os.path.getsize(dst)
    print(f"  {weight}: {size // 1024} KB ({size} bytes) → {dst}")


def main() -> None:
    chars = collect_chars()
    cjk = [char for char in chars if ord(char) > 0x2E80]
    print(f"字元集合：{len(chars)} 個（其中 CJK {len(cjk)} 個）")

    os.makedirs(FONT_OUT, exist_ok=True)

    for weight in WEIGHTS:
        subset_font(weight, "".join(sorted(chars)))

    print("完成")


if __name__ == "__main__":
    main()
