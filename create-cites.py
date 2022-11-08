import json


cites = {
    'example': [],
    'test': [],
}

with open('test-data.json') as f:
    data = json.load(f)

data = sorted(data, key=lambda x: x['id'])

cites['example'] = [[{'id': item['id']}] for item in data]

with open('test-cites.json', 'w') as f:
    json.dump(cites, f, indent='\t')
    f.write('\n')
