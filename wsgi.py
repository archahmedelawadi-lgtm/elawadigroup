import sys
path = '/home/YOUR_USERNAME/YOUR_PROJECT_FOLDER'
if path not in sys.path:
    sys.path.append(path)

from flask_app import app as application

if __name__ == "__main__":
    application.run()