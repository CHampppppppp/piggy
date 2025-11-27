from pathlib import Path
root = Path('.')
image_dir = root / 'public' / 'images'
if not image_dir.exists():
    raise SystemExit('images dir missing')
names = [p.name for p in image_dir.iterdir() if p.is_file()]
replacements = []
for name in names:
    replacements.append((f"'/{name}'", f"'/images/{name}'"))
    replacements.append((f'"/{name}"', f'"/images/{name}"'))
seen = {}
replacements = [seen.setdefault(pair, pair) for pair in replacements if pair not in seen]
target_suffixes = {'.ts', '.tsx', '.jsx', '.js', '.css', '.md', '.mjs'}
for file in root.rglob('*'):
    if not file.is_file():
        continue
    if file.suffix not in target_suffixes:
        continue
    text = file.read_text(encoding='utf-8')
    new_text = text
    for old, new in replacements:
        if old in new_text:
            new_text = new_text.replace(old, new)
    if new_text != text:
        file.write_text(new_text, encoding='utf-8')
        print('updated', file)
