import json
import time
from pathlib import Path
import argostranslate.package
import argostranslate.translate

ROOT = Path(r'd:\proyectos\3d-human-body-anatomy')
OUT = ROOT / 'content' / 'i18n' / 'es'
OUT.mkdir(parents=True, exist_ok=True)

LAYER_FILES = ['skeleton', 'muscles', 'organs', 'arteries', 'veins', 'nerves', 'skin']
FIELDS = ('common', 'category', 'summary', 'function', 'location')

def tr(value):
    if not value or not isinstance(value, str):
        return value
    try:
        return argostranslate.translate.translate(value, 'en', 'es') or value
    except Exception:
        return value

def tr_batch(values):
    return [tr(value) for value in values]

for layer in LAYER_FILES:
    src = ROOT / 'content' / f'{layer}.json'
    data = json.loads(src.read_text(encoding='utf-8'))
    result = {'overview': {}, 'structures': {}, 'commonNames': {}}

    overview = data.get('overview', {})
    for field in ('title', 'summary', 'function'):
        if overview.get(field):
            result['overview'][field] = tr(overview[field])
    if overview.get('facts'):
        result['overview']['facts'] = [tr(x) for x in overview['facts']]

    for entry in data.get('structures', []):
        translated = {}
        texts = []
        positions = []
        for field in FIELDS:
            if entry.get(field):
                texts.append(entry[field]); positions.append(('field', field))
        for fact in entry.get('facts', []):
            texts.append(fact); positions.append(('fact', None))
        if entry.get('medical'):
            texts.append(entry['medical']); positions.append(('medical', None))
        translated_texts = tr_batch(texts)
        facts = []
        for text, (kind, field) in zip(translated_texts, positions):
            if kind == 'field': translated[field] = text
            elif kind == 'fact': facts.append(text)
            else: translated['medical_es'] = text
        if facts: translated['facts'] = facts
        result['structures'][entry['id']] = translated

    for key, value in data.get('commonNames', {}).items():
        result['commonNames'][key] = tr(value)

    (OUT / f'{layer}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Translated {layer}')

# Translate Dr. Buddy systems, FAQ and lines
src = ROOT / 'content' / 'doctor.json'
data = json.loads(src.read_text(encoding='utf-8'))
doc = {'systems': {}, 'faq': {}, 'lines': {}}
for system in data.get('systems', []):
    sid = system['id']
    doc['systems'][sid] = {
        'title': tr(system.get('title', '')),
        'summary': tr(system.get('summary', '')),
        'keyFacts': [tr(x) for x in system.get('keyFacts', [])],
    }
for i, item in enumerate(data.get('faq', [])):
    doc['faq'][str(i)] = {
        'q': tr(item.get('q', '')),
        'a': tr(item.get('a', '')),
    }

# Preserve the Spanish lines authored directly, and translate any missing fallback
existing_path = OUT / 'doctor.json'
existing = json.loads(existing_path.read_text(encoding='utf-8')) if existing_path.exists() else {}
existing_lines = existing.get('lines', {})
doc['lines'] = existing_lines or {
    'greetings': [tr(x) for x in data.get('lines', {}).get('greetings', [])],
}
(OUT / 'doctor.json').write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding='utf-8')
print('Translated doctor')
