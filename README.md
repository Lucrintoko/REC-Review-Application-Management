# Research Ethics Review Application and Management System

**Client:** Ethics Review Board (ERB) - Ateneo de Zamboanga University (AdZU)  
**Course:** Web Systems and Technologies (WEBSYSTECH - B)  
**Team:** Team HASA (September 2026)

---

## 🛠 Technology Stack
- **Frontend:** React, HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- **Backend:** PHP (RESTful endpoints, secure file management, role-based authorization)
- **Database:** MariaDB (hosted via local XAMPP environment)
- **Local Server:** XAMPP (Apache + MariaDB + PHP)
- **Build Tool:** Vite / npm

---

## 📁 Project Architecture & Directory Structure
```
REC-Review-Application-Management/
├── SRS and Flowchart/               # Specifications & Process Flowcharts
│   ├── Flowchart for Process in System.png
│   └── WEBSYSTECH_SRS_Team-HASA.pdf
├── database/                        # Database Definition
│   └── database_schema.sql          # MariaDB 3NF Schema & Initial Seeds
├── backend/                         # Server-Side PHP REST API
│   ├── api/
│   │   └── index.php                # Front controller & endpoint router
│   ├── config/
│   │   ├── database.php             # MariaDB PDO connection handler
│   │   └── cors.php                 # CORS & response header middleware
│   ├── controllers/                 # Modular business logic controllers
│   ├── uploads/                     # E-Archiving & uploaded assets
│   │   ├── payments/                # Proof-of-payment receipts
│   │   ├── documents/               # Protocols, consent forms, instruments
│   │   └── decisions/               # Decision letters & clearance certificates
│   └── .htaccess                    # Apache URL rewrite rules
├── frontend/                        # Client-Side React SPA
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Logos and graphics
│   │   ├── components/              # Shared UI components
│   │   ├── pages/                   # Role dashboards & workflow views
│   │   ├── services/
│   │   │   └── api.js               # Centralized fetch API client
│   │   ├── App.jsx                  # Main routing & layout
│   │   ├── index.css                # Custom theme styles
│   │   └── main.jsx                 # React root mount
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Node dependencies
│   └── vite.config.js               # Dev server & API proxy config
├── .gitignore
└── README.md
```

---

## 🚀 Setup & Installation

### 1. Database Setup (MariaDB / XAMPP)
1. Start **Apache** and **MySQL** via the XAMPP Control Panel.
2. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) or MySQL CLI.
3. Import or execute the SQL file:
   ```bash
   database/database_schema.sql
   ```

### 2. Backend Setup
Place this repository under your XAMPP web root (e.g., `C:/xampp/htdocs/REC-Review-Application-Management`) or configure a virtual host pointing to the directory.

### 3. Frontend Setup
Navigate to the `frontend/` directory and run:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.
