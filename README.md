# CARB Receipt Generator

A mobile-friendly web app for generating CARB truck check receipts with OCR vehicle information extraction and Google Sheets data storage.

## Features

- 📱 Mobile-first responsive design
- 📸 Multi-image upload with OCR text extraction
- 🚗 Automatic VIN decoding via NHTSA API
- 📄 Professional receipt generation
- 📊 Google Sheets data storage
- 🌐 Chinese/English bilingual interface

## Deployment Instructions

### 1. GitHub Pages Deployment

1. **Create a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/carb_receipt_gen2.git
   git push -u origin main
   ```

2. **Update the homepage URL in package.json:**
   Replace `[your-github-username]` with your actual GitHub username.

3. **Deploy to GitHub Pages:**
   ```bash
   npm run deploy
   ```

4. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Select "gh-pages" branch as source
   - Your app will be available at: `https://YOUR_USERNAME.github.io/carb_receipt_gen2`

### 2. Google Sheets Integration Setup

1. **Create a Google Sheet:**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Note the spreadsheet ID from the URL

2. **Set up Google Apps Script:**
   - Go to [Google Apps Script](https://script.google.com)
   - Create a new project
   - Copy the contents of `google-apps-script.js` into the editor
   - Save the project

3. **Deploy as Web App:**
   - Click "Deploy" → "New deployment"
   - Choose "Web app" as type
   - Set "Execute as" to "Me"
   - Set "Who has access" to "Anyone"
   - Click "Deploy"
   - Copy the web app URL

4. **Update the Web App URL:**
   - In `src/App.jsx`, replace `YOUR_GOOGLE_APPS_SCRIPT_WEBAPP_URL_HERE` with your actual web app URL

5. **Set up Spreadsheet Headers:**
   - In Google Apps Script, run the `setupHeaders()` function once to create column headers

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- **Frontend:** React 19, Vite
- **OCR:** Tesseract.js
- **Image Generation:** html2canvas
- **VIN API:** NHTSA VIN Decoder
- **Data Storage:** Google Sheets API
- **Hosting:** GitHub Pages

## File Structure

```
├── src/
│   ├── App.jsx          # Main application component
│   └── App.css          # Styles
├── public/
│   └── logo.png         # Company logo
├── google-apps-script.js # Google Sheets integration
└── package.json         # Dependencies and scripts
```

## Usage

1. **Upload Images:** Select CARB check receipt images
2. **Extract Data:** OCR automatically extracts vehicle information
3. **Edit Vehicle Info:** Review and edit extracted data
4. **Enter Customer Info:** Fill in recipient and payment details
5. **Generate Receipt:** Create and download professional receipt
6. **Data Storage:** Receipt data is automatically saved to Google Sheets

## Troubleshooting

- **OCR Issues:** Ensure images are clear and well-lit
- **VIN API Errors:** Check internet connection and API availability
- **Google Sheets:** Verify web app URL and permissions
- **Deployment:** Ensure GitHub Pages is enabled and gh-pages branch exists

## License

MIT License
