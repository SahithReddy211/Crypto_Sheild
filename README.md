# 🔐 Crypto Shield

### Crypto-Agility Based Secure Question Paper Distribution System

A full-stack web application that provides end-to-end encrypted, tamper-proof question paper creation, storage, and time-locked distribution for academic institutions. Built with cryptographic agility at its core — meaning the system can seamlessly switch between multiple encryption algorithms without architectural changes.

---

## 🚀 Features

### 🔒 Cryptographic Agility Engine
- **Multiple Encryption Algorithms**: AES-256-GCM, ChaCha20-Poly1305, AES-256-CBC + HMAC, Camellia-256
- **Hybrid Encryption**: RSA-3072 + OAEP (PKCS#1v2.1) for key encapsulation
- **Digital Signatures**: RSA-PSS with SHA-512 for integrity verification
- **Dynamic Algorithm Switching**: Swap ciphers at runtime without system downtime
- **Algorithm Profiles**: Admin-configurable cryptographic policies

### 📄 Question Paper Management
- **Secure Creation Wizard**: Multi-step paper creation with auto-encryption
- **Faculty Portal**: Upload and manage question papers with full audit trail
- **Student Exam Dashboard**: Time-locked access to exam papers
- **Admin Crypto Policy**: Configure and enforce institution-wide cryptographic standards

### ⏱️ Time-Locked Distribution
- **Scheduled Release**: Papers are released only at exam time via cryptographic tokens
- **Release Tokens**: Short-lived one-time tokens with configurable expiry
- **Automated Scheduler**: Background service handles paper release automatically

### 🛡️ Security Features
- **JWT Authentication**: Secure token-based auth with 8-hour expiry
- **Role-Based Access Control (RBAC)**: Admin, Faculty, and Student roles
- **Audit Logging**: Every cryptographic operation is logged with timestamps
- **Integrity Verification**: Cryptographic hash verification for all papers
- **Encrypted Key Store**: All encryption keys stored encrypted at rest

### 📊 Analytics & Monitoring
- **Performance Analysis**: Encryption/decryption benchmark charts
- **Algorithm Statistics**: Real-time usage stats per algorithm
- **File History**: Complete audit trail for all file operations

---

## 🏗️ Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Flask 3.0.2 |
| Database | SQLite (SQLAlchemy ORM) |
| Authentication | Flask-JWT-Extended |
| Cryptography | PyCryptodome 3.20 |
| Task Scheduling | APScheduler (via scheduler service) |
| CORS | Flask-CORS |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 (Vite) |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| HTTP Client | Axios |
| Icons | Lucide React + React Icons |

---

## 📁 Project Structure

```
CryptAnalysis/
├── backend/
│   ├── app.py                    # Flask app factory & entry point
│   ├── config.py                 # Configuration (DB, JWT, storage paths)
│   ├── requirements.txt          # Python dependencies
│   ├── seed.py                   # Database seeding script
│   ├── database/
│   │   └── db.py                 # SQLAlchemy instance
│   ├── models/
│   │   ├── user.py               # User model (Admin/Faculty/Student)
│   │   ├── exam.py               # Exam model
│   │   ├── question_paper.py     # Question paper with encryption metadata
│   │   ├── algorithm_profile.py  # Cryptographic algorithm configuration
│   │   ├── encrypted_key.py      # Encrypted key envelopes
│   │   ├── release_token.py      # Time-locked release tokens
│   │   ├── audit_log.py          # Audit trail entries
│   │   ├── file_vault.py         # Generic file encryption records
│   │   └── exam_student.py       # Exam-student enrollment
│   ├── routes/
│   │   ├── auth_routes.py        # Login, register, profile
│   │   ├── crypto_routes.py      # Algorithm profiles, stats
│   │   ├── exam_routes.py        # Exam & question paper CRUD
│   │   ├── file_routes.py        # File upload/download
│   │   └── stats_routes.py       # Dashboard statistics
│   ├── services/
│   │   ├── crypto_agility_engine.py  # Core crypto logic (all algorithms)
│   │   ├── key_release_service.py    # Token generation & paper release
│   │   ├── audit_service.py          # Audit logging
│   │   └── scheduler_service.py      # Background release scheduler
│   ├── utils/
│   │   ├── criteria_utils.py     # Eligibility/criteria helpers
│   │   └── time_utils.py         # Time parsing utilities
│   └── storage/
│       ├── uploads/              # Original uploaded files (gitignored)
│       ├── encrypted/            # AES/ChaCha encrypted papers (gitignored)
│       ├── temp/                 # Temporary decryption workspace (gitignored)
│       └── keys/                 # RSA master keys (gitignored)
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── App.jsx               # Root component with routing
        ├── main.jsx              # React entry point
        ├── index.css             # Global styles
        ├── context/
        │   ├── AuthContext.jsx   # JWT auth state
        │   └── ThemeContext.jsx  # Dark/light theme
        ├── layouts/
        │   └── MainLayout.jsx    # App shell with sidebar
        ├── components/
        │   ├── Navbar.jsx        # Top navigation bar
        │   ├── Sidebar.jsx       # Side navigation menu
        │   └── StatCard.jsx      # Dashboard stat card widget
        ├── pages/
        │   ├── Login.jsx              # Authentication page
        │   ├── Register.jsx           # User registration
        │   ├── Dashboard.jsx          # Main dashboard with stats
        │   ├── EncryptionModule.jsx   # File encryption UI
        │   ├── DecryptionModule.jsx   # File decryption UI
        │   ├── UploadModule.jsx       # File upload manager
        │   ├── FileHistory.jsx        # Audit trail viewer
        │   ├── IntegrityVerification.jsx  # Hash verification
        │   ├── PerformanceAnalysis.jsx    # Algorithm benchmarks
        │   ├── ProfilePage.jsx            # User profile settings
        │   ├── SettingsPage.jsx           # App settings
        │   └── question-papers/
        │       ├── CreateQuestionPaperWizard.jsx  # Multi-step paper creation
        │       ├── FacultyPaperManager.jsx         # Faculty paper dashboard
        │       ├── StudentExamDashboard.jsx         # Student exam portal
        │       ├── SecurePaperViewer.jsx            # Decrypt & view papers
        │       └── AdminCryptoPolicy.jsx            # Algorithm policy config
        ├── services/
        │   └── api.js            # Axios API client
        └── utils/
            └── timeFormat.js     # Date/time formatting helpers
```

---

## ⚙️ Getting Started

### Prerequisites
- **Python** 3.10+
- **Node.js** 18+
- **npm** 9+

---

### 🐍 Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate a virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

The backend will start at **http://localhost:5000**

> **Note:** On first run, the database is automatically seeded with demo users, algorithm profiles, and sample exams.

---

### ⚛️ Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start at **http://localhost:5173**

---

### 🔑 Default Demo Credentials

After seeding, the following accounts are available:

| Role | Email | Password |
|---|---|---|
| Admin | admin@university.edu | admin123 |
| Faculty | faculty@university.edu | faculty123 |
| Student | student@university.edu | student123 |

---

## 🔐 Supported Cryptographic Algorithms

| Algorithm | Type | Key Size | Use Case |
|---|---|---|---|
| AES-256-GCM | Symmetric AEAD | 256-bit | Default — authenticated encryption |
| ChaCha20-Poly1305 | Symmetric AEAD | 256-bit | High-performance alternative |
| AES-256-CBC + HMAC | Symmetric + MAC | 256-bit | Legacy compatibility |
| Camellia-256-CBC | Symmetric | 256-bit | Alternative standard |
| RSA-3072-OAEP | Asymmetric | 3072-bit | Key encapsulation |
| RSA-PSS SHA-512 | Signature | 3072-bit | Digital signatures |

---

## 🌐 API Overview

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login & receive JWT |
| GET | `/api/auth/profile` | Get current user profile |

### Question Papers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/exams/` | List all exams |
| POST | `/api/exams/` | Create a new exam |
| POST | `/api/exams/<id>/question-papers` | Upload & encrypt a question paper |
| GET | `/api/exams/<id>/question-papers` | List papers for an exam |
| POST | `/api/exams/question-papers/<id>/release` | Request a time-locked release token |
| POST | `/api/exams/question-papers/<id>/decrypt` | Decrypt a paper with valid token |

### Crypto
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crypto/algorithms` | List available algorithms |
| GET | `/api/crypto/profiles` | Get configured algorithm profiles |
| POST | `/api/crypto/profiles` | Create/update algorithm profile |

### Files (Generic)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/files/upload` | Upload and encrypt a file |
| POST | `/api/files/decrypt/<id>` | Decrypt a stored file |
| GET | `/api/files/history` | File audit history |

### Statistics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats/dashboard` | Dashboard summary stats |
| GET | `/api/stats/performance` | Algorithm performance metrics |

---

## 🔒 Security Architecture

```
+-------------------------------------------------+
|              CLIENT (React SPA)                  |
|  JWT stored in memory . Axios interceptors       |
+----------------------+--------------------------+
                       | HTTPS (JWT Bearer)
+----------------------v--------------------------+
|               FLASK REST API                     |
|  JWT Validation . RBAC Guards . CORS            |
+----------------------+--------------------------+
                       |
        +--------------v--------------+
        |   Crypto Agility Engine     |
        |  AES-GCM / ChaCha20 /       |
        |  CBC+HMAC / Camellia        |
        |  RSA-3072 Key Wrapping      |
        |  RSA-PSS Signatures         |
        +--------------+--------------+
                       |
        +--------------v--------------+
        |       Encrypted Storage     |
        |  *.enc  -- cipher text       |
        |  *.pem  -- RSA master keys   |
        |  SQLite -- metadata + logs   |
        +-----------------------------+
```

**Key design principles:**
- **Separation of concerns**: Encryption keys are never stored alongside ciphertext
- **Key wrapping**: Session keys are RSA-OAEP wrapped before database storage
- **Integrity-first**: Every file gets a digital signature; verified on decryption
- **Audit everything**: Every crypto operation (encrypt/decrypt/sign/verify) is logged with user, timestamp, and algorithm

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 📦 Environment Variables

Create a `.env` file in `backend/` to override defaults:

```env
SECRET_KEY=your-very-long-random-secret
JWT_SECRET_KEY=your-jwt-secret-key
DATABASE_URL=sqlite:///crypto_agility.db
```

> ⚠️ **Never commit `.env` files.** They are excluded by `.gitignore`.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is developed for academic research purposes.

---

## 👨‍💻 Author

**Sahith Reddy** — [GitHub](https://github.com/SahithReddy211)

---

> *"Security is not a product, but a process."* — Bruce Schneier
