# SSBR Rooms Dashboard — Setup Guide

## 1. GitHub Pages (frontend hosting)

1. Create a new GitHub repo (e.g. `ssbr-dashboard`)
2. Upload `index.html` and `.nojekyll` to the repo root
3. Go to **Settings → Pages → Source → Deploy from branch → main / root**
4. Your dashboard will be live at `https://YOUR-USERNAME.github.io/ssbr-dashboard/`

---

## 2. Google Apps Script (backend)

### Create the project
1. Go to [script.google.com](https://script.google.com) → **New project**
2. Delete the default `Code.gs` content
3. Paste the contents of `Code.gs` from this folder
4. Click the gear icon ⚙ → **Project Settings** → tick **Show `appsscript.json`**
5. Click on `appsscript.json` in the left panel and paste the contents from this folder's `appsscript.json`

### Deploy as Web App
1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone** *(required so the browser can call it)*
5. Click **Deploy** → copy the **Web App URL**

### Configure the dashboard
1. Open your GitHub Pages URL
2. Go to **⚙ Settings** in the sidebar
3. Paste the **Web App URL** into the *Google Apps Script Web App URL* field
4. Paste your **Google Drive Folder ID** into the *Drive Folder ID* field
   - Open your Drive folder → copy the ID from the URL:
     `drive.google.com/drive/folders/`**`FOLDER_ID_HERE`**
5. Click **💾 Save Settings**
6. Click **🔗 Test Connection** — you should see a success toast

---

## 3. How sync works

| Button | What it does |
|--------|-------------|
| **☁ Sync to Sheets** (Monthly Billing) | Writes one row per unit for the selected month into the *Monthly Billing* sheet |
| **☁ Sync to Sheets** (Daily Sales) | Writes one row per unit per day with a value into the *Daily Sales* sheet |
| **☁ Save to Drive** (Receipts) | Uploads all receipt images/PDFs to `Drive Folder / Receipts / YYYY-MM /` |

Data is also always saved locally in your browser (localStorage) so the app works offline.

---

## 4. Google Drive folder structure (auto-created)

```
Your Drive Folder/
├── Receipts/
│   ├── 2025-06/
│   │   ├── Receipt_2025-06_electricity.jpg
│   │   └── Receipt_2025-06_water.pdf
│   └── 2025-07/
```
