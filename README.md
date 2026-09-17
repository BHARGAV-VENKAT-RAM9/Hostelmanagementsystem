# LuxeHostel — Smart Hostel & Accommodation Management System

A full-stack hostel management platform featuring real-time floor & bed vacancy tracking, an interactive student portal with multi-mode payment gateway and loyalty coin redemption, and an administrator management dashboard.

---

## 🌟 Key Features

### 🏢 Visitor & Public Portal
- **Interactive 5-Floor Grid:** Live visual overview of all 5 floors and 50 rooms (AC and Non-AC).
- **Live Vacancy & Occupancy Stats:** Instant overview of available beds, occupied status, and room details.

### 🎓 Student Resident Portal
- **Room & Bed View:** Detailed breakdown of assigned room, bed number, monthly rate, and room type.
- **Interactive Payment Gateway:** Multi-method checkout (UPI, Cards, Net Banking) with split payment support (Cash + Online) and printable receipts.
- **LuxeCoins Loyalty Rewards:** Students can earn and redeem reward coins directly towards rent discounts.
- **Complaint & Helpdesk System:** Categorized maintenance ticketing (Cleaning, Electrical, Plumbing, Wi-Fi, Furniture) with live status updates.

### 🛡️ Admin Management Portal
- **Bed & Room Allocation:** Check-in new students with contact details and 1-click check-out.
- **Automated Billing Engine:** Generate and track monthly invoices across all occupied beds.
- **Dynamic Pricing Controls:** Adjust base rates for AC and Non-AC rooms with immediate system-wide sync.
- **Ticket Resolution Queue:** Filter and resolve maintenance complaints lodged by students.

---

## 🛠️ Tech Stack

- **Frontend (Visitor & Student):** React 19, Vite, Lucide Icons, Modern CSS3 (Glassmorphic theme)
- **Admin Frontend:** React 19, Vite, Lucide Icons, Dedicated Dashboard
- **Backend:** Node.js, Express.js (RESTful APIs, CORS)
- **Database / State:** Persistent JSON storage with automated data initialization

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (Node Package Manager)

### 2. Installation & Running

#### Step 1: Run the Backend Server
```bash
cd backend
npm install
npm run dev
```
*Backend runs on:* `http://localhost:5000`

#### Step 2: Run the Student/Visitor Portal
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on:* `http://localhost:5173`

#### Step 3: Run the Admin Management Portal
In a new terminal:
```bash
cd adminfrontend
npm install
npm run dev
```
*Admin Portal runs on:* `http://localhost:5174`

---

## 📂 Project Structure

```
Hostel/
├── backend/            # Express.js REST API & persistent state storage
│   ├── data/           # Database JSON storage
│   └── server.js       # Main server & route handlers
├── frontend/           # React 19 client portal for Visitors & Students
│   └── src/
│       ├── student/    # Student dashboard & payment gateway
│       ├── visitor/    # Public interactive floor grid
│       └── components/ # Navbar, Login modal, shared components
├── adminfrontend/      # React 19 admin management portal
│   └── src/
│       └── admin/      # Room management, billing & complaint dashboard
├── .gitignore          # Root Git ignore rules
└── README.md           # Documentation
```

---

## 📄 License
This project is open-source under the MIT License.
