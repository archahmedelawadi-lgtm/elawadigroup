import re

path = r"c:\Users\aee\Desktop\ahmed\js\main.js"
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'const STATIC_TEXT_PAIRS\s*=\s*\[.*?\];', '', text, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
