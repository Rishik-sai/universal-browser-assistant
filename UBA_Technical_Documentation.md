---
title: Universal Browser Assistant (UBA) Technical Documentation
author: AI Engineer
date: May 2026
---

# 1. COVER PAGE
**Project Name:** Universal Browser Assistant (UBA)
**Tagline:** Context-Aware AI directly in your Browser
**Author:** Rishik Sai (istyl)
**Tech Stack:** Vanilla JS (Extension), Python, FastAPI, MongoDB, LangChain, Groq (LLaMA-3)
**GitHub Repository Link:** https://github.com/Rishik-sai/universal-browser-assistant
**Date:** May 2026
**Version:** 1.0.0

---

# 2. EXECUTIVE SUMMARY
### What problem this project solves
Modern web browsing involves constant context switching. Users frequently copy-paste text between browser tabs and AI assistants like ChatGPT to summarize long articles, translate regional text, or explain complex jargon. The Universal Browser Assistant (UBA) solves this by injecting an AI directly into the browser DOM that intrinsically understands the user's current context.

### Why this project matters
By utilizing an AI that "sees" what the user sees, UBA removes friction. Users can ask questions about the page they are on, trigger bulk translations, and receive intelligent suggestions without ever leaving the tab. 

### Real-world applications
- **Research & Education:** Summarizing academic papers and long articles.
- **Localization:** Real-time, context-aware DOM translation for regional Indian languages.
- **Productivity:** Providing quick answers to queries without breaking workflow.

### Target users
Researchers, students, professionals, and non-native English speakers who require seamless content translation and summarization.

### Expected impact
Significant reduction in tab-switching overhead, improved accessibility of foreign/technical content, and an overall enhancement in web browsing productivity.

---

# 3. PROJECT ARCHITECTURE

### High-level architecture explanation
The system operates on a decoupled client-server architecture:
1. **Client (Chrome Extension):** A Manifest V3 extension containing content scripts that interact with the DOM (using Shadow DOM for CSS isolation) and a background Service Worker that manages cross-origin API communication and token storage.
2. **Server (FastAPI Backend):** A robust Python web server that handles API routing, authentication (JWT), database operations, and AI orchestration.
3. **Database (MongoDB Atlas):** A NoSQL data store maintaining user credentials and domain-specific chat histories.
4. **State Store (Redis):** An ultra-fast in-memory store for conversational histories, allowing stateless horizontal scaling.
5. **AI Layer (Groq, LangChain & Tavily):** The backend communicates with Groq's LPUs via LangChain to generate high-speed LLM inferences, and can fetch real-time web data via Tavily.

### Folder structure explanation

**`/extension`**
- **Purpose:** Houses all frontend logic and UI injection.
- **Important Files:** `manifest.json`, `background.js`, `content.js`.
- **Why this structure:** Keeps the extension fully decoupled from the backend logic, ensuring it remains lightweight and complies with Google's Manifest V3 constraints.

**`/backend/app`**
- **Purpose:** Core backend application logic.
- **Important Files:** `main.py` (entry point), `routes/` (API endpoints), `services/agent_pipeline.py` (AI logic).
- **Why this structure:** Follows the standard FastAPI modular architecture. Separating `routes`, `services`, and `middleware` ensures clean architecture and high maintainability.

---

# 4. TECH STACK ANALYSIS

### FastAPI (Backend Framework)
- **Why it was selected:** Unparalleled asynchronous performance and native support for Python's AI ecosystem (LangChain, OpenAI, etc.).
- **Advantages:** Blazing fast, automatic OpenAPI documentation (Swagger), robust Pydantic validation.
- **Tradeoffs:** Smaller ecosystem for monolithic features compared to Django.
- **Alternatives considered:** Express.js (Node.js) was originally used but dropped because Python natively integrates with LangChain and AI libraries much better.

### MongoDB (Database)
- **Why it was selected:** Flexible schema structure ideal for storing unstructured chat histories and dynamic JSON data.
- **Advantages:** Fast reads/writes, easy horizontal scaling, natural mapping to Python dictionaries.
- **Tradeoffs:** Lacks strict ACID transactional guarantees across multiple documents (though not needed here).
- **Alternatives considered:** PostgreSQL. Rejected because chat logs are inherently document-oriented and don't require rigid relational schemas.

### LangChain & Groq (AI Engine)
- **Why it was selected:** LangChain standardizes prompt engineering and model interactions. Groq provides LPU-accelerated inference that is significantly faster than traditional GPU providers.
- **Advantages:** Real-time conversational speed (crucial for a browser assistant).
- **Tradeoffs:** Groq has rate limits and fewer model choices compared to OpenAI.
- **Alternatives considered:** OpenAI API. Rejected because Groq's inference speed creates a substantially better UX for real-time web interactions.

### Vanilla JS (Frontend)
- **Why it was selected:** Chrome extensions run in restrictive environments. Using React/Vue requires complex build pipelines (Webpack/Vite) which complicate Manifest V3 compliance.
- **Advantages:** Zero dependencies, minimal footprint, lightning-fast execution.

---

# 5. FEATURE-BY-FEATURE BREAKDOWN

## Context-Aware Chat
### Purpose
Allows the user to query the AI about the contents of the current webpage.

### User Flow
User opens the UBA widget -> Asks a question -> The extension extracts page text -> Sends to Backend -> Backend queries AI with context -> Returns answer.

### Internal Working
- **Data flow:** `content.js` extracts `document.body.innerText` -> sends via `chrome.runtime.sendMessage` to `background.js` -> `fetch()` POST to `/api/chat`.
- **Model inference flow:** The backend injects the text into a `SystemMessage` prompt template via LangChain, appending the user's query and conversational memory, and requests inference from Groq.

### Important Code Snippets
```python
# From agent_pipeline.py
system_instruction = f"""
You are the Universal Browser Assistant. Helpful, professional, and clear.

=== CONTEXT ===
URL: {url_context}
PAGE TEXT: {page_text[:3000]}
"""
messages = [
    SystemMessage(content=system_instruction),
    *memory_store[session_id]
]
ai_response = await self.model.ainvoke(messages)
```
- **What it does:** Dynamically builds a system prompt injecting up to 3000 characters of the page context, followed by the session's conversational memory.
- **Why this approach:** By heavily restricting the context window (`[:3000]`), we prevent token-limit exceptions and reduce latency while giving the LLM enough context to answer accurately.
- **Optimization:** In-memory session tracking avoids database reads during the hot path of the conversation loop.

## Domain-Specific Chat History
### Purpose
Saves and restores chat context based on the website the user is currently viewing.

### User Flow
User visits `wikipedia.org` -> Widget loads -> Widget shows previous chats explicitly related to Wikipedia.

### Important Code Snippets
```python
# From app/routes/history.py
@router.get("/{domain}")
async def get_history(domain: str, user=Depends(get_current_user)):
    user_id = user["id"]
    cursor = db.history.find({"userId": user_id, "domain": domain}).sort("timestamp", 1)
    history = await cursor.to_list(length=100)
    return {"success": True, "history": serialize_doc(history)}
```
- **What it does:** Queries MongoDB for messages matching both the authenticated user and the encoded domain string, sorting them chronologically.
- **Why this approach:** Keeps context highly localized. Mixing chat history from YouTube with a coding blog would corrupt the AI's contextual awareness.
- **Scalability benefits:** The database query uses dual conditions. Adding a compound index on `{"userId": 1, "domain": 1}` ensures O(log N) read speeds regardless of database size.

---

# 6. CORE LOGIC EXPLANATION

### Prompt Engineering & Agent Workflows
The AI logic relies heavily on precise prompt engineering via LangChain. 
We utilize a multi-modal prompt strategy:
1. **Initial Suggestions Mode:** When a user opens the widget, a specialized prompt forces the LLM to output a strictly formatted JSON array of 3 suggested queries based on the page text.
2. **Translation Mode:** The prompt explicitly forbids conversational padding, forcing the LLM to return translations delimited by `|||`.
3. **Query Mode:** Standard RAG (Retrieval-Augmented Generation) style injection where the context is provided as a System Message.

```python
# Delimited Output Forcing for Bulk Translation
prompt = f"""
TASK: Translate the following list of strings EXCLUSIVELY into {target_language}.
CRITICAL RULES:
1. Maintain exactly the same order.
2. Separate each translation with the delimiter " ||| ".
INPUT LIST:
{"\n".join(clean_texts)}
"""
```
- **Why the code was written this way:** LLMs are notorious for adding polite padding ("Sure, here are your translations..."). By enforcing a strict delimiter `|||`, the backend can safely run `.split("|||")` and map the array of translated strings back to the exact DOM nodes in the frontend, without risking array length mismatches.

---

# 7. API DOCUMENTATION

### Authentication
**Endpoint:** `POST /api/auth/register`
- **Request Body:** `{"email": "user@test.com", "password": "password123"}`
- **Response Format:** `{"success": true, "token": "jwt_string", "user": {...}}`
- **Error Handling:** 409 Conflict if email exists; 400 Bad Request for validation.

### Chat Inference
**Endpoint:** `POST /api/chat`
- **Request Body:** 
  ```json
  {
    "message": "Summarize this",
    "context": {"url": "example.com", "pageText": "long text..."}
  }
  ```
- **Authentication:** `Bearer <JWT_TOKEN>` required.
- **Response Format:** `{"reply": "Summary...", "mode": "QUERY_MODE"}`

---

# 8. DATABASE DESIGN

**Database:** MongoDB
**Collections:**
1. `users`
   - `_id`: ObjectId
   - `email`: String (Unique Index)
   - `password`: String (bcrypt hash)
   - `createdAt`: ISODate
2. `history`
   - `_id`: ObjectId
   - `userId`: String (Indexed)
   - `domain`: String (Indexed)
   - `role`: String ("user" | "assistant")
   - `content`: String
   - `timestamp`: ISODate

**Indexing Strategy:** 
A compound index on `history` for `{ userId: 1, domain: 1 }` is utilized to optimize the `GET /api/history/{domain}` endpoint, turning collection scans into fast index scans.

---

# 9. AI/ML SECTION (IMPORTANT)

### Inference Pipeline
- **Model Architecture:** LLaMA-3 (via Groq API). LLaMA-3 is an auto-regressive language model that uses an optimized transformer architecture.
- **Hardware Optimization:** Instead of running inference on GPUs (NVIDIA A100/H100), the project leverages Groq's **LPU (Language Processing Unit)**. LPUs bypass the traditional memory bottleneck of GPUs by providing deterministic execution and massive SRAM pools, achieving inference speeds exceeding 800 tokens per second.
- **RAG Pipeline (Retrieval-Augmented Generation):** Rather than using a complex Vector Database (like Pinecone) for a simple page query, the architecture uses a "Zero-Shot Injection" technique. Up to 3000 characters of the active DOM are injected directly into the LLM's context window.

---

# 10. PERFORMANCE OPTIMIZATION

### Async Execution
FastAPI is built on Starlette and uses Python's `asyncio`.
```python
# Async Database Call Example
user = await db.users.find_one({"email": email_clean})
```
- **Latency Reduction:** By using `await`, the server thread is immediately yielded back to the event loop while MongoDB processes the query. This allows a single FastAPI worker to handle thousands of concurrent chat requests without blocking.

### Memory Optimization
- **Session Memory:** LangChain memory is managed via an external **Redis** store. This acts as an ultra-fast L1 cache for active conversations, eliminating the need to re-fetch the past 10 messages from MongoDB for every query, while allowing the FastAPI instances to scale horizontally statelessly.

---

# 11. SECURITY ANALYSIS

- **Authentication:** Stateless JSON Web Tokens (JWT) using `HS256`. 
- **Authorization:** `app/middleware/auth.py` acts as a guard. If a valid JWT is not present in the `Authorization` header, the request is instantly rejected with `401 Unauthorized`.
- **Password Security:** Stored using `bcrypt` hashing with a 10-round salt, securing against brute-force and rainbow table attacks.
- **XSS Prevention:** The frontend Extension utilizes Manifest V3's strict Content Security Policy (CSP), strictly disallowing `eval()` and inline scripts. Furthermore, DOM injection is wrapped inside a **Shadow DOM**, which isolates the widget's execution context.

---

# 12. DEPLOYMENT GUIDE

### Local Setup
1. Clone the repository.
2. Setup a Python virtual environment: `python -m venv .venv` and activate it.
3. Install dependencies: `pip install -r requirements.txt`.
4. Create a `.env` file with:
   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/uba_assistant
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_super_secret_key
   GROQ_API_KEY=your_groq_key
   TAVILY_API_KEY=your_tavily_key
   ```
5. Run the backend: `uvicorn app.main:app --reload --port 3000`.
6. Load the `extension/` folder in Chrome via `chrome://extensions` -> Load Unpacked.

---

# 13. CHALLENGES & SOLUTIONS

### Issue: CSS Conflicts with Host Websites
- **The Issue:** Injecting a UI widget directly into a website's `<body>` caused host CSS rules (like `div { margin: 0 }`) to ruin the widget's styling.
- **The Solution:** Implemented a **Shadow DOM** in `content.js`. The Shadow Root acts as a CSS barrier. The widget's CSS is injected inside the Shadow Root, preventing styles from leaking in or out.
- **Tradeoffs:** Makes DOM querying slightly more complex (e.g., you cannot use `document.getElementById` to find widget buttons; you must query inside the `shadowRoot`).

### Issue: Cross-Origin Resource Sharing (CORS) Blocks
- **The Issue:** The content script executing on `https://google.com` was blocked by the browser when trying to `fetch()` data from `http://localhost:3000` due to CORS.
- **The Solution:** Offloaded all network requests to the extension's Background Service Worker (`background.js`). Service Workers have elevated privileges and bypass standard webpage CORS restrictions.

---

# 14. FUTURE IMPROVEMENTS

- **Scalability:** Horizontal scaling across multiple worker nodes (e.g. Kubernetes) is now fully supported thanks to the migration of conversational memory to Redis.
- **AI Upgrades:** Implement a local Vector Database (like ChromaDB or Faiss) on the backend to allow for persistent, cross-domain semantic search (e.g., "What did I read about quantum physics last week?").
- **Enterprise-grade Upgrades:** Implement WebSocket connections instead of REST polling for a more fluid, typing-indicator-style chat experience.

---

# 15. CONCLUSION

The Universal Browser Assistant successfully demonstrates the integration of high-speed AI inference (Groq/LangChain) with standard web technologies. By employing a decoupled architecture, strict asynchronous programming paradigms, and thoughtful security models (JWT, Shadow DOM), the project stands as a highly robust, scalable, and secure application. The technical decisions made prioritize real-time performance and user experience above all else.
