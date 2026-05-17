import json
import re

main_js_path = r"c:\Users\aee\Desktop\ahmed\js\main.js"
content_json_path = r"c:\Users\aee\Desktop\ahmed\data\content.json"

with open(main_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract STATIC_TEXT_PAIRS
match = re.search(r'const STATIC_TEXT_PAIRS = \[(.*?)\];', content, re.DOTALL)
if match:
    pairs_str = match.group(1)
    pairs = re.findall(r"\['(.*?)',\s*'(.*?)'\]", pairs_str)
    
    with open(content_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if "translations" not in data:
        data["translations"] = []
        
    # Replace translations
    data["translations"] = [{"ar": ar, "en": en} for ar, en in pairs]
    
    with open(content_json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Extracted translations to content.json")
else:
    print("Could not find STATIC_TEXT_PAIRS")
