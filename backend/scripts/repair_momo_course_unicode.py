"""Repair lossy Vietnamese text in the three Momo course seed files.

The source files were committed after accented characters had already been
replaced by literal ``?`` characters.  The mapping below is deliberately
reviewable and limited to the known course copy.  By default this command only
checks and prints what would change; pass ``--apply`` to rewrite the seed files.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


SEED_DIR = Path(__file__).resolve().parents[1] / "seeds" / "courses"
SEED_FILES = (
    SEED_DIR / "momo_home_family.json",
    SEED_DIR / "momo_nature.json",
    SEED_DIR / "momo_school_food.json",
)

# Exact replacements avoid guessing at legitimate Vietnamese punctuation.
REPLACEMENTS = {
    "??": "đỏ",
    "?? ch?i": "đồ chơi",
    "?en": "đen",
    "?n": "ăn",
    "?n ? nh?": "Ôn ở nhà",
    "?n thi?n nhi?n": "Ôn thiên nhiên",
    "?n tr??ng h?c": "Ôn trường học",
    "b?": "bố",
    "B? ??c c?ng Momo b?ng gi?ng th?t r?.": "Bé đọc cùng Momo bằng giọng thật rõ.",
    "B? ?n l?i t? ?? h?c.": "Bé ôn lại từ đã học.",
    "B? ?n t? v? gia ??nh v? ng?i nh?.": "Bé ôn từ về gia đình và ngôi nhà.",
    "B? G?u Momo H?c Ti?ng Anh ? Tr??ng": "Bé Gấu Momo Học Tiếng Anh Ở Trường",
    "B? G?u Momo H?c Ti?ng Anh C?ng Thi?n Nhi?n": "Bé Gấu Momo Học Tiếng Anh Cùng Thiên Nhiên",
    "B? G?u Momo H?c Ti?ng Anh Trong Ng?i Nh? Nh?": "Bé Gấu Momo Học Tiếng Anh Trong Ngôi Nhà Nhỏ",
    "B? h?c ?? v?t trong ph?ng.": "Bé học đồ vật trong phòng.",
    "B? h?c action time b?ng h?nh, ?m thanh v? tr? ch?i.": "Bé học action time bằng hình, âm thanh và trò chơi.",
    "B? h?c b?ng video ng?n, truy?n ??c theo, tr? ch?i, ph?t ?m v? quiz vui.": "Bé học bằng video ngắn, truyện đọc theo, trò chơi, phát âm và quiz vui.",
    "B? h?c c?c th?nh vi?n gia ??nh.": "Bé học các thành viên gia đình.",
    "B? h?c c?m x?c ??n gi?n.": "Bé học cảm xúc đơn giản.",
    "B? h?c color hunt b?ng h?nh, ?m thanh v? tr? ch?i.": "Bé học color hunt bằng hình, âm thanh và trò chơi.",
    "B? h?c lunch box b?ng h?nh, ?m thanh v? tr? ch?i.": "Bé học lunch box bằng hình, âm thanh và trò chơi.",
    "B? h?c m?n ?n d? nh?.": "Bé học món ăn dễ nhớ.",
    "B? h?c my classroom b?ng h?nh, ?m thanh v? tr? ch?i.": "Bé học my classroom bằng hình, âm thanh và trò chơi.",
    "B? h?c number play b?ng h?nh, ?m thanh v? tr? ch?i.": "Bé học number play bằng hình, âm thanh và trò chơi.",
    "B? h?c school review b?ng h?nh, ?m thanh v? tr? ch?i.": "Bé học school review bằng hình, âm thanh và trò chơi.",
    "B? h?c sun, sky, yellow.": "Bé học sun, sky, yellow.",
    "B? h?c t? cho th?i quen t?t.": "Bé học từ cho thói quen tốt.",
    "B? h?c v? c?y v? l?.": "Bé học về cây và lá.",
    "B? n?i Blue.": "Bé nói Blue.",
    "B? n?i Egg.": "Bé nói Egg.",
    "B? n?i Jump.": "Bé nói Jump.",
    "B? n?i Pencil.": "Bé nói Pencil.",
    "B? n?i Red.": "Bé nói Red.",
    "B? n?i Two.": "Bé nói Two.",
    "B? nghe ti?ng chim v? n?i t? bird.": "Bé nghe tiếng chim và nói từ bird.",
    "B? nghe v? n?i Bed.": "Bé nghe và nói Bed.",
    "B? nghe v? n?i Big.": "Bé nghe và nói Big.",
    "B? nghe v? n?i Chair.": "Bé nghe và nói Chair.",
    "B? nghe v? n?i Dad.": "Bé nghe và nói Dad.",
    "B? nghe v? n?i Fly.": "Bé nghe và nói Fly.",
    "B? nghe v? n?i Leaf.": "Bé nghe và nói Leaf.",
    "B? nghe v? n?i Milk.": "Bé nghe và nói Milk.",
    "B? nghe v? n?i Sad.": "Bé nghe và nói Sad.",
    "B? nghe v? n?i Sky.": "Bé nghe và nói Sky.",
    "B? nghe v? n?i Soap.": "Bé nghe và nói Soap.",
    "B? nghe v? n?i Tree.": "Bé nghe và nói Tree.",
    "B? nghe v? n?i Water.": "Bé nghe và nói Water.",
    "B?i ng?n, nhi?u h?nh, b? ch?u h?c m?i ng?y.": "Bài ngắn, nhiều hình, bé chịu học mỗi ngày.",
    "B?m nghe, sau ?? n?i l?i th?t to.": "Bấm nghe, sau đó nói lại thật to.",
    "b?n": "bạn",
    "b?n tay": "bàn tay",
    "b?ng": "bóng",
    "b?nh quy": "bánh quy",
    "B?t ??u v?i ng?i nh?": "Bắt đầu với ngôi nhà",
    "B?t ??u v?i thi?n nhi?n": "Bắt đầu với thiên nhiên",
    "B?t ??u v?i tr??ng h?c": "Bắt đầu với trường học",
    "b?t ch?": "bút chì",
    "b?u tr?i": "bầu trời",
    "B?u tr?i n?ng": "Bầu trời nắng",
    "Ba c?a Bin": "Ba của Bin",
    "Baby ngh?a l? g??": "Baby nghĩa là gì?",
    "Big ngh?a l? g??": "Big nghĩa là gì?",
    "Bird l?m g??": "Bird làm gì?",
    "Blue l? m?u n?o?": "Blue là màu nào?",
    "Blue ngh?a l? g??": "Blue nghĩa là gì?",
    "bu?n": "buồn",
    "c?a": "cửa",
    "c?i gh?": "cái ghế",
    "c?i v?i": "cái vòi",
    "C?i v?i l? t? n?o?": "Cái vòi là từ nào?",
    "c?m": "cơm",
    "C?m x?c vui": "Cảm xúc vui",
    "C?ng Momo kh?m ph? thi?n nhi?n h?m nay": "Cùng Momo khám phá thiên nhiên hôm nay",
    "c?p s?ch": "cặp sách",
    "c?y": "cây",
    "C?y xanh": "Cây xanh",
    "Ch? ?? l?p h?c g?n g?i, b? nh? t? nhanh h?n.": "Chủ đề lớp học gần gũi, bé nhớ từ nhanh hơn.",
    "Ch?i v?i s?": "Chơi với số",
    "Ch?nh x?c! Con l?m t?t l?m.": "Chính xác! Con làm tốt lắm.",
    "Ch?o gia ??nh": "Chào gia đình",
    "ch?y": "chạy",
    "Chair l? g??": "Chair là gì?",
    "chi?c l?": "chiếc lá",
    "Chim nh?": "Chim nhỏ",
    "Clean l? g??": "Clean là gì?",
    "Con ??c theo r?t t?t. Momo nghe r? r?i!": "Con đọc theo rất tốt. Momo nghe rõ rồi!",
    "Con ch?n apple.": "Con chọn apple.",
    "Con ch?n bed.": "Con chọn bed.",
    "Con ch?n bird.": "Con chọn bird.",
    "Con ch?n Book nh?.": "Con chọn Book nhé.",
    "Con ch?n c?y nh?.": "Con chọn cây nhé.",
    "Con ch?n elephant.": "Con chọn elephant.",
    "Con ch?n happy.": "Con chọn happy.",
    "Con ch?n mom.": "Con chọn mom.",
    "Con ch?n One nh?.": "Con chọn One nhé.",
    "Con ch?n Red nh?.": "Con chọn Red nhé.",
    "Con ch?n Rice nh?.": "Con chọn Rice nhé.",
    "Con ch?n Run nh?.": "Con chọn Run nhé.",
    "Con ch?n soap.": "Con chọn soap.",
    "Con ch?n sun.": "Con chọn sun.",
    "Con ch?n tree.": "Con chọn tree.",
    "Con gh?p h?nh r?t t?t!": "Con ghép hình rất tốt!",
    "Con ho?n th?nh m?t ph?n h?c m?i c?ng Momo!": "Con hoàn thành một phần học mới cùng Momo!",
    "Con n?i apple v? happy r?t vui!": "Con nói apple và happy rất vui!",
    "Con nghe t? n?o?": "Con nghe từ nào?",
    "Con ph?t ?m r? h?n r?i!": "Con phát âm rõ hơn rồi!",
    "Con th?ch ch?m v?o h?nh v? n?i elephant!": "Con thích chạm vào hình và nói elephant!",
    "Con th?ch n?i book, pencil v? jump!": "Con thích nói book, pencil và jump!",
    "Con th?y river ? ??u?": "Con thấy river ở đâu?",
    "Cookie l? m?n n?o?": "Cookie là món nào?",
    "d?ng s?ng": "dòng sông",
    "D?ng s?ng vui": "Dòng sông vui",
    "Dad l? ai?": "Dad là ai?",
    "Egg ngh?a l? g??": "Egg nghĩa là gì?",
    "em b?": "em bé",
    "Fly ngh?a l? g??": "Fly nghĩa là gì?",
    "G?p b?n voi": "Gặp bạn voi",
    "gh?": "ghế",
    "Gh?p t? v?i h?nh ??ng.": "Ghép từ với hình đúng.",
    "Gi? ?n nh?": "Giờ ăn nhẹ",
    "Gi? v?n ??ng": "Giờ vận động",
    "gi??ng": "giường",
    "Gi?i qu?! Con ch?n ??ng r?i.": "Giỏi quá! Con chọn đúng rồi.",
    "Gi?ng c?a con r? h?n r?i, gi?i l?m!": "Giọng của con rõ hơn rồi, giỏi lắm!",
    "Gia ??nh": "Gia đình",
    "Green l? m?u g??": "Green là màu gì?",
    "H?c t? gia ??nh, ?? v?t v? c?m x?c trong nh?.": "Học từ gia đình, đồ vật và cảm xúc trong nhà.",
    "H?c t? l?p h?c, m?u s?c, s? ??m, ?? ?n v? h?nh ??ng.": "Học từ lớp học, màu sắc, số đếm, đồ ăn và hành động.",
    "H?c t? thi?n nhi?n qua video, tr? ch?i v? ph?t ?m.": "Học từ thiên nhiên qua video, trò chơi và phát âm.",
    "H?c ti?ng Anh trong ng?i nh? nh?": "Học tiếng Anh trong ngôi nhà nhỏ",
    "h?ng": "hồng",
    "H?p c?m tr?a": "Hộp cơm trưa",
    "Hand ngh?a l? g??": "Hand nghĩa là gì?",
    "Happy l? g??": "Happy là gì?",
    "Jump ngh?a l? g??": "Jump nghĩa là gì?",
    "K?o ho?c ch?n h?nh gi?ng t? ti?ng Anh.": "Kéo hoặc chọn hình giống từ tiếng Anh.",
    "Kh?ng sao, m?nh nghe l?i v? th? th?m m?t l?n nh?.": "Không sao, mình nghe lại và thử thêm một lần nhé.",
    "l?": "lá",
    "L?p h?c c?a b?": "Lớp học của bé",
    "Leaf l? g??": "Leaf là gì?",
    "m?": "mẹ",
    "M? c?a An": "Mẹ của An",
    "M? c?a Khoa": "Mẹ của Khoa",
    "M?i ph?n h?c c? video ng?n, tr? ch?i, luy?n ph?t ?m, ho?t ??ng h?nh ?nh, quiz v? sticker th??ng.": "Mỗi phần học có video ngắn, trò chơi, luyện phát âm, hoạt động hình ảnh, quiz và sticker thưởng.",
    "M?i ph?n h?c c? video, ??c theo, game, ph?t ?m v? quiz ng?n.": "Mỗi phần học có video, đọc theo, game, phát âm và quiz ngắn.",
    "M?i ph?n h?c ch? v?i ph?t: xem, ch?i, n?i, ch?n ??p ?n v? nh?n sticker.": "Mỗi phần học chỉ vài phút: xem, chơi, nói, chọn đáp án và nhận sticker.",
    "m?m c??i": "mỉm cười",
    "M?nh nghe l?i r?i ch?n th?m l?n n?a nh?.": "Mình nghe lại rồi chọn thêm lần nữa nhé.",
    "m?o": "mèo",
    "m?t tr?i": "mặt trời",
    "m?u ??": "màu đỏ",
    "m?u v?ng": "màu vàng",
    "m?u xanh d??ng": "màu xanh dương",
    "m?u xanh l?": "màu xanh lá",
    "m?y": "mây",
    "Milk l? g??": "Milk là gì?",
    "Momo nh?n th?y b?n tay.": "Momo nhìn thấy bàn tay.",
    "Momo nh?n th?y c?m.": "Momo nhìn thấy cơm.",
    "Momo nh?n th?y c?y.": "Momo nhìn thấy cây.",
    "Momo nh?n th?y ch?y.": "Momo nhìn thấy chạy.",
    "Momo nh?n th?y con chim.": "Momo nhìn thấy con chim.",
    "Momo nh?n th?y con voi.": "Momo nhìn thấy con voi.",
    "Momo nh?n th?y d?ng s?ng.": "Momo nhìn thấy dòng sông.",
    "Momo nh?n th?y gi??ng.": "Momo nhìn thấy giường.",
    "Momo nh?n th?y m?.": "Momo nhìn thấy mẹ.",
    "Momo nh?n th?y m?t tr?i.": "Momo nhìn thấy mặt trời.",
    "Momo nh?n th?y m?u ??.": "Momo nhìn thấy màu đỏ.",
    "Momo nh?n th?y qu? t?o.": "Momo nhìn thấy quả táo.",
    "Momo nh?n th?y quy?n s?ch.": "Momo nhìn thấy quyển sách.",
    "Momo nh?n th?y s? m?t.": "Momo nhìn thấy số một.",
    "Momo nh?n th?y vui.": "Momo nhìn thấy vui.",
    "Momo nh?n th?y: Apple.": "Momo nhìn thấy: Apple.",
    "Momo nh?n th?y: Bed.": "Momo nhìn thấy: Bed.",
    "Momo nh?n th?y: Bird.": "Momo nhìn thấy: Bird.",
    "Momo nh?n th?y: Book.": "Momo nhìn thấy: Book.",
    "Momo nh?n th?y: Elephant.": "Momo nhìn thấy: Elephant.",
    "Momo nh?n th?y: Hand.": "Momo nhìn thấy: Hand.",
    "Momo nh?n th?y: Happy.": "Momo nhìn thấy: Happy.",
    "Momo nh?n th?y: Mom.": "Momo nhìn thấy: Mom.",
    "Momo nh?n th?y: One.": "Momo nhìn thấy: One.",
    "Momo nh?n th?y: Red.": "Momo nhìn thấy: Red.",
    "Momo nh?n th?y: Rice.": "Momo nhìn thấy: Rice.",
    "Momo nh?n th?y: River.": "Momo nhìn thấy: River.",
    "Momo nh?n th?y: Run.": "Momo nhìn thấy: Run.",
    "Momo nh?n th?y: Sun.": "Momo nhìn thấy: Sun.",
    "Momo nh?n th?y: Tree.": "Momo nhìn thấy: Tree.",
    "Momo v? tay khen b?.": "Momo vỗ tay khen bé.",
    "n??c": "nước",
    "n??c ?p": "nước ép",
    "N?i dung g?n g?i trong nh? n?n b? nh? nhanh.": "Nội dung gần gũi trong nhà nên bé nhớ nhanh.",
    "ng?": "ngủ",
    "Nghe ?m thanh n??c v? h?c t? m?i.": "Nghe âm thanh nước và học từ mới.",
    "Nghe Momo ??c, nh?n h?nh, r?i ??c theo t?ng c?u ng?n.": "Nghe Momo đọc, nhìn hình, rồi đọc theo từng câu ngắn.",
    "Nghe Momo n?i r?i ch?m v?o h?nh ??ng.": "Nghe Momo nói rồi chạm vào hình đúng.",
    "Nghe v? ch?m v?o h?nh con voi.": "Nghe và chạm vào hình con voi.",
    "Nghe v? n?i l?i t?ng t?.": "Nghe và nói lại từng từ.",
    "nh?": "nhỏ",
    "nh?y": "nhảy",
    "Nhanh qu?! Con ch?n r?t gi?i.": "Nhanh quá! Con chọn rất giỏi.",
    "Pencil ngh?a l? g??": "Pencil nghĩa là gì?",
    "Ph?ng c?a b?": "Phòng của bé",
    "qu? t?o": "quả táo",
    "quy?n s?ch": "quyển sách",
    "R?a tay s?ch": "Rửa tay sạch",
    "Red ngh?a l? g??": "Red nghĩa là gì?",
    "s? ba": "số ba",
    "s? hai": "số hai",
    "s? m?t": "số một",
    "s?a": "sữa",
    "s?ch": "sạch",
    "Sad l? g??": "Sad là gì?",
    "Sky l? g??": "Sky là gì?",
    "Small l? g??": "Small là gì?",
    "Smile ngh?a l? g??": "Smile nghĩa là gì?",
    "T? gia ??nh, ?? v?t, m?n ?n v? c?m x?c ???c h?c b?ng h?nh, ?m thanh v? tr? ch?i.": "Từ gia đình, đồ vật, món ăn và cảm xúc được học bằng hình, âm thanh và trò chơi.",
    "T?m m?u s?c": "Tìm màu sắc",
    "Thi?n nhi?n": "Thiên nhiên",
    "Toy ngh?a l? g??": "Toy nghĩa là gì?",
    "Tr??ng h?c": "Trường học",
    "tr?ng": "trứng",
    "Tuy?t v?i! Con ?? ch?i r?t nhanh.": "Tuyệt vời! Con đã chơi rất nhanh.",
    "Two ngh?a l? g??": "Two nghĩa là gì?",
    "v? tay": "vỗ tay",
    "v?ng": "vàng",
    "V?o l?p h?c ti?ng Anh c?ng Momo": "Vào lớp học tiếng Anh cùng Momo",
    "Water ngh?a l? g??": "Water nghĩa là gì?",
    "x? ph?ng": "xà phòng",
    "xanh d??ng": "xanh dương",
    "xanh l?": "xanh lá",
    "Yellow l? m?u n?o?": "Yellow là màu nào?",
}

# A lossy token can represent different original words.  These overrides are
# keyed by course id + JSON path and are applied before the exact value map.
PATH_OVERRIDES = {
    ("momo-home-family-english-5-7", "lessons[0].quiz[2].options[1].label"): "bạn",
    ("momo-home-family-english-5-7", "lessons[3].quiz[2].options[1].label"): "bẩn",
}


def repair_value(value: Any, course_id: str, path: str, changes: list[tuple[str, str, str]]) -> Any:
    if isinstance(value, str):
        repaired = PATH_OVERRIDES.get((course_id, path), REPLACEMENTS.get(value, value))
        if repaired != value:
            changes.append((path, value, repaired))
        return repaired
    if isinstance(value, list):
        return [repair_value(item, course_id, f"{path}[{index}]", changes) for index, item in enumerate(value)]
    if isinstance(value, dict):
        return {
            key: repair_value(item, course_id, f"{path}.{key}" if path else key, changes)
            for key, item in value.items()
        }
    return value


def suspicious_strings(value: Any, path: str = "") -> list[tuple[str, str]]:
    if isinstance(value, str):
        # A final question mark is valid punctuation; any earlier one indicates
        # unrepaired lossy text.  Mojibake markers are always invalid here.
        body = value.rstrip().rstrip("?!")
        if "?" in body or "�" in value or "Ã" in value:
            return [(path, value)]
        return []
    if isinstance(value, list):
        found: list[tuple[str, str]] = []
        for index, item in enumerate(value):
            found.extend(suspicious_strings(item, f"{path}[{index}]"))
        return found
    if isinstance(value, dict):
        found = []
        for key, item in value.items():
            found.extend(suspicious_strings(item, f"{path}.{key}" if path else key))
        return found
    return []


def process(path: Path, apply: bool) -> tuple[int, list[tuple[str, str]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    course_id = data["course_id"]
    changes: list[tuple[str, str, str]] = []
    repaired = repair_value(data, course_id, "", changes)
    remaining = suspicious_strings(repaired)

    print(f"{path.name}: {len(changes)} replacements, {len(remaining)} suspicious strings remain")
    for item_path, original, replacement in changes[:5]:
        print(f"  {item_path}: {original!r} -> {replacement!r}")
    for item_path, text in remaining[:10]:
        print(f"  UNRESOLVED {item_path}: {text!r}")

    if apply and not remaining:
        path.write_text(json.dumps(repaired, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(changes), remaining


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="rewrite seed files after a clean validation")
    args = parser.parse_args()

    unresolved: list[tuple[str, str]] = []
    for seed_file in SEED_FILES:
        _, remaining = process(seed_file, args.apply)
        unresolved.extend(remaining)

    if unresolved:
        print(f"Refusing to write: {len(unresolved)} suspicious strings still need an explicit mapping.")
        return 1
    if not args.apply:
        print("Dry run passed. Re-run with --apply to repair the tracked seed files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
