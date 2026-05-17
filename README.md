# ELAWADI STUDIO Architecture CMS

A full-stack architecture portfolio website with a custom-built Python CMS (Admin Panel).

## Features
- **Dynamic Content**: Manage everything (Hero, Services, Portfolio, Blog, About, Contact) from the Admin Panel.
- **Secure CMS**: Password-protected dashboard with session tokens and hashing.
- **Image Uploads**: Direct image management for projects and blog posts.
- **Bilingual Ready**: Built-in language switcher support.
- **Responsive Design**: Elegant dark & gold theme that works on all devices.

## How to Run Locally
1. Ensure you have Python 3.x installed.
2. Open your terminal in the project directory.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python flask_app.py
   ```
5. Open your browser:
   - **Website**: [http://localhost:8080](http://localhost:8080)
   - **Admin Panel**: [http://localhost:8080/admin.html](http://localhost:8080/admin.html)

## Deployment (Free Hosting)
You can deploy this project for free on platforms like **Render**, **Railway**, or **PythonAnywhere**.

### Deploying to Render:
1. Push your code to GitHub.
2. Create a "New Web Service" on Render.
3. Connect your GitHub repository.
4. Set:
   - **Runtime**: `Python`
   - **Start Command**: `python app_server.py`
5. Render will automatically assign a `PORT` environment variable, which the server is already configured to use.

## How to Run on PythonAnywhere
1. Go to the **Web** tab in your PythonAnywhere dashboard.
2. Click **Add a new web app**.
3. Select **Flask** and choose **Python 3.x**.
4. When asked for the path to your flask app, point it to your `flask_app.py` file.
5. In the **WSGI configuration file** (link found in the Web tab), ensure it looks like this:
   ```python
   import sys
   path = '/home/YOUR_USERNAME/YOUR_PROJECT_FOLDER'
   if path not in sys.path:
       sys.path.append(path)
   from flask_app import app as application
   ```
6. Click **Reload** on the Web tab.

## Admin Credentials
- Set `ADMIN_USER` and `ADMIN_PASSWORD` (or `ADMIN_PASS_HASH`) in your environment before running in production.
- See `env.example` for the full list of required variables.
