# AI Interview Backend Architecture

This document provides a comprehensive overview of the backend folder structure, file responsibilities, and the core design patterns used in the AI Interviewer application.

---

## 📁 Root Structure (`/backend`)

| File/Folder | Purpose |
| :--- | :--- |
| `src/` | Main source code directory. |
| `uploads/` | Temporary storage for local PDF uploads (cleared after process). |
| `.env` | Environment variables (API Keys, DB URI, Secret Keys). |
| `package.json` | Project dependencies and scripts. |

---

## 📁 Source Directory (`/backend/src`)

### 🛠️ Core Files
- **`server.js`**: Application entry point. Handles HTTP server initialization, database connection, and WebSocket (Socket.io) binding.
- **`app.js`**: Express application configuration. Sets up security headers (Helmet), CORS, rate limiting, logging middleware, and route registration.
- **`socket.js`**: Real-time communication logic. Manages live interview "follow-up" questions using streaming Groq responses.

---

### 📂 `config/` (System Configuration)
- **`db.js`**: MongoDB connection logic using Mongoose.
- **`cloudinary.js`**: Configuration for Cloudinary (Remote storage for resume PDFs).
- **`groq.js`**: Shared client for Groq LLM API.
- **`logger.js`**: Winston/Morgan logger setup for production-grade logging.

---

### 📂 `services/` (The "Brain" of the App)
*This is where all complex business logic and AI integrations reside.*

- **`ai.service.js`**: Orchestrates all LLM calls (Question generation, Answer evaluation, Grounding validation, Final reports).
- **`rag.service.js`**: Retrieval-Augmented Generation pipeline. Handles embedding, vector stores, and metadata-aware retrieval.
- **`chunking.service.js`**: Semantic document splitting. Detects sections (Skills, Experience) and ensures context is preserved in chunks.
- **`optimizer.service.js`**: Semantic query optimizer to expand raw user topics into dense technical search queries.

---

### 📂 `controllers/` (Route Handlers)
*Manages the request/response lifecycle. Acts as the bridge between Routes and Services.*

- **`auth.controller.js`**: Handles Login, Registration, and JWT issuance.
- **`resume.controller.js`**: Manages PDF uploads, text extraction, and semantic chunk previews.
- **`interview.controller.js`**: Creates and finds interview templates.
- **`session.controller.js`**: Manages active interview sessions, saving answers, and triggering AI evaluations.
- **`user.controller.js`**: User profile management and dashboard statistics.

---

### 📂 `models/` (Data Schemas)
- **`User.model.js`**: Defines user profiles, auth data, and credits/usage stats.
- **`Resume.model.js`**: Stores extracted text, parsed JSON data, and Cloudinary URLs.
- **`Interview.model.js`**: Template for an interview, containing the set of generated questions.
- **`Session.model.js`**: Stores candidate answers, AI scores, and final feedback reports.

---

### 📂 `routes/` (API Endpoints)
- **`auth.routes.js`**: `/api/auth`
- **`resume.routes.js`**: `/api/resumes`
- **`interview.routes.js`**: `/api/interviews`
- **`session.routes.js`**: `/api/sessions`
- **`user.routes.js`**: `/api/users`

---

### 📂 `middleware/` (Request Processing)
- **`auth.middleware.js`**: Protects routes using JWT verification and role checks.
- **`upload.middleware.js`**: Handles multi-part/form-data for PDF uploads using Multer.
- **`errorHandler.js`**: Global centralized error handler for consistent API responses.
- **`requestLogger.js`**: Logs incoming request details (Method, URL, time).
- **`validate.js`**: Joi/Zod-like validation for incoming request bodies.

---

### 📂 `utils/` (Helper Utilities)
- **`AppError.js`**: Custom error class for operational errors.
- **`jwt.utils.js`**: Token signing and verification helpers.
- **`normalizer.js`**: **Text Pre-processor** — cleans and standardizes text (JS -> JavaScript) before it hits the embedding API.
