import re
import os

file_path = r'd:\deploy-code-analyzer\backend\main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = re.sub(
    r'uvicorn\.run\(app, host="0\.0\.0\.0", port=8000\)',
    'port = int(os.getenv("PORT", 7860))\n    uvicorn.run(app, host="0.0.0.0", port=port)',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated main.py")
