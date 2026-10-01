# 🤖 AI Interviewer

<div align="center">

![AI Interviewer Banner](https://img.shields.io/badge/AI-Interviewer-6C63FF?style=for-the-badge&logo=robot&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

**An Intelligent AI-Powered Interview Platform — Parse Resume, Generate Questions, Evaluate in Real-time.**

[Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 📖 About the Project

**AI Interviewer** is a full-stack web application that conducts AI-powered mock interviews for candidates. This platform:

- Uploads and parses your **Resume (PDF)**
- Generates **intelligent interview questions** based on Job Description and Topics (via RAG pipeline)
- Asks **real-time follow-up questions** (through Socket.io streaming)
- Evaluates every answer with AI and provides a **detailed feedback report**
- Shows relevant jobs via the **Job Board** feature

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📄 **Resume Parsing** | PDF upload → Text extraction → Semantic chunking |
| 🧠 **RAG Pipeline** | LangChain + OpenAI Embeddings → Context-aware question generation |
| 💬 **Real-time Interview** | Live follow-up questions via Socket.io streaming |
| 📊 **AI Evaluation** | Score and feedback for each answer using Groq LLM |
| 📈 **Dashboard** | Interview history, scores, and performance analytics |
| 💼 **Job Board** | Live job listings from Adzuna API |
| 🔐 **Auth System** | JWT-based secure authentication |
| ☁️ **Cloud Storage** | Resume files stored on Cloudinary |
| ⚡ **Redis Cache** | For fast job search results and API responses |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB (Mongoose)
- **AI / LLM**: Groq SDK, LangChain, OpenAI Embeddings
- **Real-time**: Socket.io
- **File Storage**: Cloudinary + Multer
- **Cache**: Redis (ioredis)
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Security**: Helmet, CORS, express-rate-limit
- **Logging**: Winston + Morgan
- **Job Search API**: Adzuna

### Frontend
- **Framework**: React 18 + Vite
- **State Management**: Zustand + TanStack React Query
- **Routing**: React Router v6
- **UI / Animations**: Framer Motion, Lucide React, React Icons
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **Real-time**: Socket.io Client
- **Markdown**: React Markdown

---

## 📁 Project Structure

```
AI-Interviewer/
├── backend/
│   └── src/
│       ├── server.js          # Entry point — HTTP + WebSocket server
│       ├── app.js             # Express config — middleware, routes
│       ├── socket.js          # Real-time follow-up Q&A logic
│       ├── config/            # DB, Cloudinary, Groq, Logger
│       ├── controllers/       # Route handlers
│       │   ├── auth.controller.js
│       │   ├── resume.controller.js
│       │   ├── interview.controller.js
│       │   ├── session.controller.js
│       │   └── user.controller.js
│       ├── services/          # Business logic & AI integrations
│       │   ├── ai.service.js       # LLM orchestration
│       │   ├── rag.service.js      # RAG pipeline
│       │   ├── chunking.service.js # Semantic document splitting
│       │   └── optimizer.service.js
│       ├── models/            # Mongoose schemas
│       │   ├── User.model.js
│       │   ├── Resume.model.js
│       │   ├── Interview.model.js
│       │   └── Session.model.js
│       ├── routes/            # API route definitions
│       ├── middleware/        # Auth, validation, error handling
│       └── utils/             # Helpers — AppError, JWT, normalizer
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── pages/             # LandingPage, Dashboard, Interview, Jobs, etc.
        ├── components/        # Reusable UI components
        ├── context/           # React context providers
        ├── hooks/             # Custom React hooks
        ├── services/          # API call functions (axios)
        ├── store/             # Zustand state stores
        └── utils/             # Helper utilities
```

---

## 🚀 Getting Started

### Prerequisites

The following must be installed before proceeding:

- [Node.js](https://nodejs.org/) v18+
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (or local MongoDB)
- [Redis](https://redis.io/) (local or cloud — Upstash/Redis Cloud)
- [Groq API Key](https://console.groq.com) — Free
- [OpenAI API Key](https://platform.openai.com) — For Embeddings
- [Cloudinary Account](https://cloudinary.com) — For File Storage
- [Adzuna API](https://developer.adzuna.com/) — For Job Search (optional)

---

### ⚙️ Installation

**1. Clone the Repository**

```bash
git clone https://github.com/your-username/AI-Interviewer.git
cd AI-Interviewer
```

**2. Backend Setup**

```bash
cd backend
npm install
```

Create `backend/.env` file (by copying `.env.example`):

```bash
cp .env.example .env
```

Fill in your values in `.env` (see below 👇)

**3. Frontend Setup**

```bash
cd ../frontend
npm install
```

Create `frontend/.env` file:

```bash
cp .env.example .env
```

---

### 🔑 Environment Variables

#### `backend/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai_interview_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_min_32_chars
JWT_REFRESH_EXPIRE=30d

# Groq AI (Free LLM)
GROQ_API_KEY=your_groq_api_key_here

# OpenAI (For Embeddings)
OPENAI_API_KEY=your_openai_api_key_here

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (CORS)
CLIENT_URL=http://localhost:5173

# Redis
REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Adzuna Job Search (Optional)
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
ADZUNA_COUNTRY=in
```

#### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
```

---

### ▶️ Run the Application

**Backend (Terminal 1):**

```bash
cd backend
npm run dev
```

Backend will start at `http://localhost:5000`.

**Frontend (Terminal 2):**

```bash
cd frontend
npm run dev
```

Frontend will open at `http://localhost:5173`.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `POST` | `/api/resumes/upload` | Upload Resume PDF |
| `GET`  | `/api/resumes` | View all resumes |
| `POST` | `/api/interviews` | Create a new interview |
| `GET`  | `/api/interviews/:id` | Interview details |
| `POST` | `/api/sessions` | Start an interview session |
| `POST` | `/api/sessions/:id/answer` | Submit and evaluate answer |
| `GET`  | `/api/sessions/:id/report` | Final feedback report |
| `GET`  | `/api/users/dashboard` | Dashboard stats |

---

## 🧠 AI Flow — How It Works

```
Resume PDF Upload
       ↓
Text Extraction (pdf-parse)
       ↓
Semantic Chunking (LangChain TextSplitters)
       ↓
Vector Embeddings (OpenAI)
       ↓
Save to Vector Store
       ↓
Create Interview (Job Role + Topics)
       ↓
Query Optimization (optimizer.service.js)
       ↓
RAG Retrieval — fetch relevant resume chunks
       ↓
Question Generation (Groq LLM)
       ↓
Real-time Interview (Socket.io)
       ↓
Answer Evaluation (Groq LLM)
       ↓
Generate Final Report
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push the branch: `git push origin feature/AmazingFeature`
5. Open a **Pull Request**

---

## 📄 License

This project is under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Aftab Alam** — AI Project

---

<div align="center">

Made with ❤️ using **Groq**, **React**, and **MongoDB**

⭐ If you find this project helpful, please give it a Star!

</div>
