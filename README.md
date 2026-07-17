# 🛡️ SecureIQ — AI Security Intelligence Platform

> **The first LLM-native, agent-driven security intelligence platform that automates SOC analyst work.**

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-orange)](https://langchain.ai)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)
[![Backend](https://img.shields.io/badge/Backend-Live%20on%20Railway-success)](https://secureiq-production.up.railway.app)
[![Model](https://img.shields.io/badge/HuggingFace-secureiq--threat--classifier-yellow)](https://huggingface.co/Nitesh208/secureiq-threat-classifier)

---

## 📌 What is SecureIQ?

SecureIQ is an open-source AI security intelligence platform that **automates the work of a SOC (Security Operations Centre) analyst**. 

Right now in every company, when a security alert fires, an analyst manually has to:
- Google the IP or CVE
- Search past incidents for similar patterns  
- Calculate how serious it is
- Write an incident report
- Decide whether to escalate

**That takes 20–40 minutes per alert. SecureIQ does it in under 30 seconds — automatically.**

### How it's different from Splunk, Elastic, Graylog

Every existing SIEM tool is a **dashboard tool** — they collect logs, display charts, and fire alerts when rules are broken. The human analyst still investigates. SecureIQ **automates the investigation itself** using a LangGraph autonomous agent. That's the gap no tool has filled.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SecureIQ Platform                       │
├─────────────────┬───────────────────┬───────────────────────┤
│   Layer 1       │   Layer 2         │   Layer 3             │
│   RAG KB        │   LangGraph       │   Real-time           │
│                 │   Agent           │   Pipeline            │
│  LlamaIndex     │                   │                       │
│  ChromaDB       │  analyze_input    │  CVE Feed (NVD)       │
│  NVD CVE Data   │  search_kb        │  Security News RSS    │
│  Groq LLM       │  score_risk       │  Isolation Forest     │
│                 │  generate_report  │  Anomaly Detection    │
│                 │  send_alert       │  APScheduler          │
├─────────────────┴───────────────────┴───────────────────────┤
│   Layer 4 — Fine-tuned LLM                                  │
│   Llama 3.2 3B + LoRA on NVD CVE data (Google Colab T4)    │
│   huggingface.co/Nitesh208/secureiq-threat-classifier       │
├─────────────────────────────────────────────────────────────┤
│   Layer 5 — React Dashboard                                 │
│   Dashboard · Investigate · Anomaly · Threat Feed           │
│   History · Knowledge Base                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🔍 Autonomous Investigation Agent (LangGraph)
- 4-node pipeline: **Analyze → Search KB → Score Risk → Generate Report**
- Accepts any security alert as natural language input
- Autonomously searches knowledge base for similar CVEs
- Calculates contextual risk score (0–100) based on event type, severity, time-of-day
- Generates structured incident report with evidence, assessment, recommendations
- Fires **Telegram alert with snapshot** if risk score > 50
- Saves investigation history with full report

### 🧠 RAG Security Knowledge Base
- Ingests NVD CVE data (real vulnerability database from US government)
- LlamaIndex + ChromaDB for semantic search
- Natural language queries: *"What CVEs are related to buffer overflow?"*
- Powered by Groq's free Llama 3.1 70B inference (fastest free LLM API)

### 📊 Real-Time Threat Pipeline
- Fetches live CVE feeds from NVD API every hour automatically
- Pulls security news from The Hacker News RSS feed
- **Isolation Forest ML model** detects statistical anomalies in server logs
- Hybrid scoring: ML + rule-based (failed logins, admin access, IP patterns)
- Auto-triggers agent investigation for HIGH/CRITICAL anomalies

### 🤖 Fine-Tuned Security LLM
- Llama 3.2 3B fine-tuned on 200+ real NVD CVE records using LoRA
- Trained with Unsloth on Google Colab T4 GPU (free)
- Domain-specific: understands CVSS scores, severity classification, CVE format
- Public model: [huggingface.co/Nitesh208/secureiq-threat-classifier](https://huggingface.co/Nitesh208/secureiq-threat-classifier)

### 📱 Telegram Alert System
- Instant push notification on threat detection
- Formatted alert with: severity badge, event type, risk score, timestamp
- Escalation for unacknowledged HIGH/CRITICAL alerts
- Works with any Telegram account (free forever)

### 🖥️ React Dashboard
- 6 pages: Dashboard, Investigate, Anomaly Detection, Threat Feed, History, Knowledge Base
- Live alert feed with real-time updates
- Terminal-style anomaly log analysis
- Investigation history with risk score timeline
- Semantic knowledge base search

---

## 🛠️ Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| API Server | FastAPI + uvicorn | Async, WebSocket support |
| LLM Inference | Groq (llama-3.3-70b-versatile) | Fastest free inference, 6000 req/day |
| Agent Framework | LangGraph + LangChain | Multi-step autonomous agent |
| Vector Database | ChromaDB (local) | Zero cost, no external service |
| RAG Framework | LlamaIndex | Document ingestion + retrieval |
| Anomaly Detection | scikit-learn Isolation Forest | Unsupervised ML, zero labeling |
| Fine-tuning | Unsloth + LoRA | 2x faster training on free GPU |
| Base Model | Llama 3.2 3B Instruct | Open weights, MIT-compatible |
| Alerts | Telegram Bot API | Free, instant, supports images |
| Scheduler | APScheduler | Background jobs for live feeds |
| Frontend | React + TypeScript + Tailwind | Modern, fast |
| Router | TanStack Router | Type-safe routing |
| Backend Deploy | Railway (Docker) | Free $5/month credit |
| Frontend Deploy | Vercel | Free, auto-deploy from GitHub |
| Model Hosting | HuggingFace Hub | Free public model card |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/nite208/secureiq.git
cd secureiq
```

### 2. Set up Python environment
```bash
python -m venv venv
source venv/Scripts/activate  # Windows
# source venv/bin/activate    # Mac/Linux
pip install -r requirements.txt
```

### 3. Configure environment variables
```bash
cp .env.example .env
# Fill in your values:
```

```env
GROQ_API_KEY=your_groq_key          # free at console.groq.com
GROQ_MODEL=llama-3.3-70b-versatile
TELEGRAM_BOT_TOKEN=your_bot_token   # free via @BotFather
TELEGRAM_CHAT_ID=your_chat_id
HF_MODEL_ID=Nitesh208/secureiq-threat-classifier
HF_API_TOKEN=your_hf_token          # free at huggingface.co
CHROMA_PERSIST_DIR=./data/chroma_db
CVE_DATA_DIR=./data/cve
APP_ENV=development
```

### 4. Start the backend
```bash
python main.py
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 5. Start the frontend
```bash
cd dashboard
npm install
npm run dev
# Dashboard at http://localhost:4173
```

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| Backend API | [secureiq-production.up.railway.app](https://secureiq-production.up.railway.app) |
| API Docs (Swagger) | [secureiq-production.up.railway.app/docs](https://secureiq-production.up.railway.app/docs) |
| Fine-tuned Model | [huggingface.co/Nitesh208/secureiq-threat-classifier](https://huggingface.co/Nitesh208/secureiq-threat-classifier) |
| GitHub | [github.com/nite208/secureiq](https://github.com/nite208/secureiq) |

---

## 📡 API Endpoints

### Investigation Agent
```
POST /api/agent/investigate     — Run full LangGraph investigation on an alert
GET  /api/agent/history         — Get last 10 investigations
```

### RAG Knowledge Base
```
POST /api/rag/query             — Natural language search over CVE knowledge base
POST /api/rag/ingest            — Rebuild vector store from latest CVE data
GET  /api/rag/stats             — Knowledge base stats (document count, last updated)
```

### Real-Time Pipeline
```
GET  /api/pipeline/feeds        — Get latest CVE + security news feeds
GET  /api/pipeline/status       — Scheduler status + last run timestamps
POST /api/pipeline/anomaly/analyze  — Analyze log text for anomalies
POST /api/pipeline/anomaly/train    — Train anomaly model on custom logs
```

---

## 🧪 Test Cases

All 8 core test cases pass:

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1 | RAG query: SQL injection severity | Answer with security context | ✅ Pass |
| 2 | Low risk alert (file download) | Score 40, NO Telegram alert | ✅ Pass |
| 3 | High risk alert (weapon + failed logins) | Score 72+, Telegram fires | ✅ Pass |
| 4 | Normal server logs | NORMAL verdict, LOW severity | ✅ Pass |
| 5 | Attack pattern logs (47 failed logins) | ANOMALY, HIGH severity | ✅ Pass |
| 6 | Investigation history | All investigations persist | ✅ Pass |
| 7 | Threat feed refresh | CVEs + security news populate | ✅ Pass |
| 8 | End-to-end demo (fire alert) | Score 100, Telegram < 30s | ✅ Pass |

---

## 📁 Project Structure

```
secureiq/
├── main.py                    ← FastAPI app entry point
├── requirements.txt           ← Python dependencies
├── Dockerfile                 ← Docker config for Railway
├── runtime.txt                ← Python version pin
├── .env.example               ← Environment variable template
│
├── agents/                    ← LangGraph investigation agent
│   ├── investigation_agent.py ← 4-node StateGraph
│   ├── tools.py               ← Agent tools (RAG, risk score, Telegram, web search)
│   └── api.py                 ← /api/agent/* endpoints
│
├── rag/                       ← RAG knowledge base
│   ├── data_loader.py         ← NVD CVE ingestion
│   ├── embedder.py            ← ChromaDB + LlamaIndex vector store
│   ├── retriever.py           ← SecurityRAG class
│   └── api.py                 ← /api/rag/* endpoints
│
├── pipeline/                  ← Real-time threat pipeline
│   ├── data_fetcher.py        ← CVE feed + security news
│   ├── anomaly_detector.py    ← Isolation Forest + rule-based hybrid
│   ├── scheduler.py           ← APScheduler background jobs
│   └── api.py                 ← /api/pipeline/* endpoints
│
├── utils/
│   └── model_inference.py     ← HuggingFace fine-tuned model integration
│
├── models/
│   └── secureiq_finetuning.ipynb  ← Google Colab training notebook
│
├── data/
│   └── cve/                   ← CVE JSON data files
│
└── dashboard/                 ← React frontend
    ├── src/
    │   ├── routes/            ← 6 page components
    │   ├── components/        ← Reusable UI components
    │   └── lib/               ← API client, utilities
    └── public/
        └── favicon.svg        ← Custom SecureIQ icon
```

---

## 🔮 Roadmap — What's Coming Next

### v1.1 — Production Features (Next 2 weeks)
- [ ] **File upload log ingestion** — drag and drop .log, .csv, .json files instead of pasting text
- [ ] **Multi-alert correlation** — paste 5 alerts, agent asks "are these a coordinated attack?"
- [ ] **PDF incident report export** — one-click professional PDF with evidence + timeline
- [ ] **Threat timeline visualization** — all investigations on a time-series chart

### v1.2 — Model Improvements
- [ ] **Retrain on 5000+ CVEs** — same Colab notebook, change `resultsPerPage=200` to `resultsPerPage=2000`
- [ ] **Auto-remediation playbooks** — step-by-step "what to do now" after every investigation
- [ ] **Cross-alert pattern learning** — detect repeat offenders across investigation history

### v2.0 — Enterprise Features (Collaboration welcome)
- [ ] **SIEM log ingestion connectors** — direct integration with popular log sources
- [ ] **Multi-tenant support** — separate knowledge bases per organisation
- [ ] **Auth layer** — JWT + RBAC for team use
- [ ] **Air-gap mode** — swap Groq for Ollama for private deployments

---

## 💡 Positioning

> SecureIQ is not competing with Splunk. It's serving the people Splunk ignores.

Splunk costs $150K–$2M/year and requires a dedicated team. Every startup, SMB, and solo security analyst who needs threat intelligence but can't afford enterprise tools — that's SecureIQ's market.

The architecture is production-ready: swap Groq for a self-hosted Ollama model and it runs completely air-gapped with zero external dependencies. That's the enterprise path.

---

## 🤝 Contributing

Contributions welcome. This is an open-source foundation — if you want to build enterprise features on top, open an issue or PR.

Areas actively looking for contributors:
- Log source connectors (syslog, Windows Event Log, AWS CloudTrail)
- Better anomaly detection models
- UI/UX improvements
- Documentation

---

## 👨‍💻 Developer

**Nitesh Kumawat**
- 🎓 Computer Engineering (Honours in Data Science), ISBM College of Engineering, Pune — 2026
- 🏆 Oracle Certified Generative AI Professional
- 🌐 Google Student Ambassador — AI/Gemini
- 💼 [LinkedIn](https://linkedin.com/in/nitesh-kumawat-185356289)
- 🐙 [GitHub](https://github.com/nite208)
- 📧 niteshkumawat2331@gmail.com

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> ⭐ If SecureIQ helped you or you find it interesting, give it a star — it helps others discover it.