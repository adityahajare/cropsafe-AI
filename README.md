# CropSafe AI

CropSafe AI is a mobile-first crop insurance web app for Indian farmers. It combines farm registration, map-based boundary drawing, weather data, Sentinel satellite imagery, NDVI analysis, disease photo scanning, claim filing, and admin-side report review.

## Project Structure

- `frontend/` - React + TypeScript + Vite farmer/admin app
- `smart-crop-backend/` - Express + MongoDB backend APIs

## Main Features

- Farmer login and registration
- Farm boundary drawing with satellite map
- Real weather lookup
- Sentinel imagery and NDVI analysis
- Disease photo scan with local Python fallback
- Claim submission and report generation
- Admin dashboard for claim and report review

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/adityahajare/cropsafe-AI.git
cd cropsafe-AI
```

### 2. Backend setup

```bash
cd smart-crop-backend
npm install
copy .env.example .env
```

Update `.env` with your own keys.

Start backend:

```bash
npm run dev
```

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
copy .env.example .env
```

Start frontend:

```bash
npm run dev
```

## Environment Files

Do not commit real secrets. Use:

- `frontend/.env.example`
- `smart-crop-backend/.env.example`

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Express
- MongoDB
- Mapbox
- OpenWeather
- Sentinel Hub
- PlantNet
- Python image analysis fallback

## GitHub Push

If your remote is already set:

```bash
git add .
git commit -m "Prepare CropSafe AI for GitHub"
git push origin main
```

If your branch is not `main`, replace it with your current branch name.

## Important

- Rotate any API keys that were ever shared in chat or screenshots.
- Keep `.env`, uploaded images, and secret JSON keys out of GitHub.
