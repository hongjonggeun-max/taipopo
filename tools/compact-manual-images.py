"""Create lossless web-only previews by removing verified blank image rows.

App assets and guide/images originals stay byte-for-byte unchanged. Install
Pillow in an external tool environment, then run this script with that Python.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'guide/manual.json').read_text(encoding='utf-8'))
# Keep an additional 16-pixel guard inside the proven uniform background band.
cuts = {'guide-settlement': (900, 1360), 'guide-report': (680, 1360)}
previews = {}
sha = lambda b: hashlib.sha256(b).hexdigest()
for code in data['localeOrder']:
    previews[code] = {}
    for record in data['locales'][code]['images']:
        if record['id'] not in cuts:
            continue
        source = root / 'guide' / record['src']
        assert sha(source.read_bytes()) == record['sha256'], source
        start, end = cuts[record['id']]
        with Image.open(source) as image:
            image.load()
            original = image.convert('RGB')
            assert original.size == (945, 1680)
            blank = original.crop((0, start, image.width, end))
            assert blank.getextrema() == ((241, 241), (246, 246), (255, 255)), source
            # Both retained boundaries are the exact same background colour.
            for y in (start - 1, end):
                assert original.crop((0, y, image.width, y + 1)).getextrema() == ((241, 241), (246, 246), (255, 255))
            bands = [[0, start], [end, image.height]]
            height = image.height - (end - start)
            compact = Image.new('RGB', (image.width, height))
            compact.paste(original.crop((0, 0, image.width, start)), (0, 0))
            compact.paste(original.crop((0, end, image.width, image.height)), (0, start))
            relative = f'previews/{code}/{record["id"]}.webp'
            target = root / 'guide' / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            compact.save(target, format='WEBP', lossless=True, exact=True, method=6)
            with Image.open(target) as decoded:
                assert decoded.convert('RGB').tobytes() == compact.tobytes(), target
            targets = []
            for box in record['targets']:
                assert (box['y'] + box['height']) * image.height <= start, 'A target overlaps the removed gap'
                targets.append({**box, 'y': box['y'] * image.height / height, 'height': box['height'] * image.height / height})
            previews[code][record['id']] = {'src': relative, 'sha256': sha(target.read_bytes()), 'width': image.width, 'height': height, 'sourceSha256': record['sha256'], 'keptBands': bands, 'targets': targets, 'pixelOperation': 'remove-uniform-background-rows-only'}
        assert sha(source.read_bytes()) == record['sha256']
(root / 'guide/previews.json').write_text(json.dumps({'schemaVersion': 1, 'previews': previews}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('PASS: 32 lossless web-only previews, exact retained pixels, no text/card/shadow/navigation removed; originals unchanged')
