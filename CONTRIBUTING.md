# Contributing to Universal Browser Assistant

We are excited that you want to contribute to the **Universal Browser Assistant (UBA)**! Here are some guidelines to help you get started.

## How to Contribute

### 1. Fork the Repository
Fork the repository on GitHub to your own account.

### 2. Clone the Repository
Clone your fork locally:
```bash
git clone https://github.com/Rishik-sai/universal-browser-assistant.git
cd universal-browser-assistant
```

### 3. Set Up Your Environment
Follow the instructions in the [README.md](README.md) to set up both the `backend` and the `extension` components of the project.

### 4. Create a Branch
Create a branch for your work:
```bash
git checkout -b feature/your-feature-name
```

### 5. Make Changes
Write clean, readable code and follow these guidelines:
- Maintain documentation integrity: Add comments and update documentation if needed.
- Follow the design principles of the floating widget: glassmorphism, responsive styles, clean variables.
- Write tests for any new backend logic.

### 6. Commit Your Changes
Make descriptive commit messages:
```bash
git commit -m "feat: add support for local translation caching"
```

### 7. Push and Create a Pull Request
Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```
Then, open a Pull Request (PR) against the main repository.

## Coding Standards

### Backend (Python/FastAPI)
- Use standard Python typing conventions and asynchronous (`async`/`await`) patterns.
- Place FastAPI routers in `app/routes`, DB logic in `app/db.py`, and core LLM services in `app/services/`.
- Secure endpoints using the JWT authentication dependency `get_current_user`.

### Extension
- Keep styling rules confined to `widget/style.css` using custom prefixing (e.g. `.uba-...`) to prevent styling conflicts on host websites.
- Use Manifest V3 standard APIs.

## Questions & Feedback
If you have any questions or find bugs, feel free to open a GitHub Issue!
