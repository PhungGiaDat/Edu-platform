# Animals Course — Design References

Visual references for the 7 sections of the Animals Adventure course (Bài 1: Cat).

## Sections

| # | Section | Headline | Artefacts |
|---|---------|----------|-----------|
| 01 | Warm-up | Khuấy động — gặp gỡ thế giới động vật | `scene-warmup.svg`, speech bubble |
| 02 | Vocabulary | Học từ vựng — Cat, Dog, Bird, Fish, Rabbit | `mascots/*.svg`, `audio-cat.mp3` |
| 03 | Listen & Choose | Nghe và chọn — rèn phản xạ nghe | listen questions, audio prompt |
| 04 | Match | Ghép hình — củng cố ghi nhớ | match pairs, draggable tiles |
| 05 | Mini-games | 5 mini-games — đa dạng thử thách | activity cards, sound fx |
| 06 | Quiz | 10 câu hỏi — kiểm tra kiến thức | quiz bank, score meter |
| 07 | Reward | Sticker + XP + streak — tạo động lực | `sticker-cat-king.svg`, XP toast |

## PNG files

- `docs/designs/animals/lesson-overview.png` — full lesson at-a-glance
- `docs/designs/animals/section-01-warmup.png` … `section-07-reward.png`

## Source SVGs (frontend-web/public/assets/animals)

- `course-cover.svg` — course hero card
- `mascots/{cat,dog,bird,fish,rabbit}.svg` — animal hero tiles
- `mascots/{cat,dog,bird,fish,rabbit}-vocab.svg` — vocabulary-lesson colour variant
- `scenes/{warmup,vocab,listen,match,games,quiz,reward}.svg` — section scene cards
- `stickers/{cat-king,dog-hero,bird-sky,fish-friend,rabbit-jump}.svg` — reward stickers

## Regenerating

```bash
python backend/scripts/generate_animals_assets.py     # SVGs
python backend/scripts/render_animals_design_pngs.py # PNGs
```

## Design language

- Claymorphic tiles (rounded 32px, soft shadow, subtle inner ring)
- Brand palette: warm orange (`#FF9847`), clay teal (`#78A8A8`), pink (`#FF607C`), cream surfaces
- Type: Segoe UI / system stack, 56pt hero, 22pt body, 18pt caption
- Each section card: section number tile + title + subtitle + hero illustration + step chips + primary CTA + artefact list
