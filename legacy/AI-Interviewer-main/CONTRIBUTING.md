# Contributing to AI-Interviewer

First, thank you for your interest in contributing to AI-Interviewer.

We welcome bug fixes, feature improvements, documentation updates, performance optimizations, and new ideas that improve the project.

---

## Before You Start

Before creating a contribution:

- Check existing Issues to avoid duplicate work.
- If you're planning a large feature, open an Issue first to discuss it.
- Keep pull requests focused on a single feature or bug fix.

---

## Development Setup

### 1. Fork the Repository

Fork this repository to your GitHub account.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/AI-Interviewer.git
```

### 3. Navigate to the Project

```bash
cd AI-Interviewer
```

### 4. Install Dependencies

Root:

```bash
npm install
```

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

### 5. Configure Environment Variables

Create a `.env` file inside the backend.

Example:

```env
PORT=5000

MONGODB_URI=

JWT_SECRET=

GROQ_API_KEY=

RESEND_API_KEY=

PINECONE_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

> Never commit `.env` files.

---

## Running the Project

Backend

```bash
cd backend
npm run dev
```

Frontend

```bash
cd frontend
npm run dev
```

---

## Branch Naming

Create a new branch before making changes.

Examples:

```
feature/add-admin-dashboard
feature/resume-parser

bugfix/login-error

docs/update-readme

refactor/auth-service
```

---

## Coding Standards

Please follow these guidelines:

- Write clean, readable code.
- Keep functions small and reusable.
- Use meaningful variable names.
- Remove unused code.
- Avoid unnecessary comments.
- Follow the existing project structure.
- Format code before committing.

---

## Commit Message Convention

Use descriptive commit messages.

Examples:

```
feat: add interview analytics

fix: resolve OTP verification issue

refactor: improve authentication flow

docs: update installation guide
```

---

## Pull Request Guidelines

Before submitting a Pull Request:

- Pull the latest changes from `main`
- Resolve merge conflicts
- Ensure the project builds successfully
- Test your changes
- Update documentation if required

Include:

- Description of the change
- Screenshots (if UI changes)
- Related Issue number (if applicable)

---

## Reporting Bugs

When reporting a bug, include:

- Expected behavior
- Actual behavior
- Steps to reproduce
- Browser/OS
- Screenshots (if available)

---

## Feature Requests

Feature requests should include:

- Problem statement
- Proposed solution
- Alternative approaches (if any)
- Additional context

---

## Code of Conduct

Please be respectful and professional when interacting with other contributors.

Constructive feedback is encouraged. Harassment, abusive behavior, or discrimination will not be tolerated.

---

## Questions

If you have questions, open an Issue and we'll be happy to discuss them.

Thank you for contributing to AI-Interviewer.
