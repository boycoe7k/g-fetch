# GHFetch

A Node.js + React developer utility with:
- GitHub latest release metadata and asset downloads
- GitHub repository ZIP downloads
- Public website HTML source viewer
- Linked CSS/JS/image asset scanner
- Public text asset viewer
- Responsive white frontend

## Run API
cd server
npm install
npm start

## Run frontend
cd frontend
npm install
npm run dev

Set `VITE_API_URL` for a separately hosted API.

For production, put the frontend behind the API or configure CORS appropriately.
Only fetch public resources you are authorized to access. The source viewer cannot reveal private server-side code.
