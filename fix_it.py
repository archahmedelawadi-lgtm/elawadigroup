import subprocess
import sys

# ده أمر عشان يسيب النسخة القديمة ويسطب Flask و Pathlib بس
try:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Flask", "pathlib"])
    print("Success: Libraries installed!")
except Exception as e:
    print(f"Error: {e}")