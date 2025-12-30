# AnonChat - Premium Secure Messaging

A high-performance, real-time anonymous messaging platform built with React, Node.js, and Socket.IO. Featuring a sleek, premium dark-mode interface and robust admin controls.

## 🚀 Key Features

- **Anonymous Identity**: Users are identified only by a randomized Anonymous ID (e.g., `#1234`).
- **Secure Access**: Individual account system with unique usernames and hashed passwords.
- **Admin Overdrive**: Dedicated admin panel for:
  - Creating and managing user accounts.
  - Wiping chat history.
  - Banning/Restricting users in real-time.
- **Micro-Animations**: Fluid UI with `framer-motion` for a premium, responsive feel.
- **Protocol Aesthetics**: Glassmorphism design system in pure black and grey.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Zustand.
- **Backend**: Node.js, Express, Socket.IO.
- **Database**: SQLite (Local persistence for users and messages).

## 📥 Setup Instructions

### 1. Server Setup
1. Navigate to the `server` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node index.js
   ```
   *The server will automatically seed the initial admin account on first run.*

### 2. Client Setup
1. Navigate to the `client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🔐 Accessing the System

To enter the chat, you need an account created by an administrator.

### Admin Credentials (Initial)
- **Username**: `admin`
- **Password**: `admin123`

### Managing Users
1. Login as **Admin**.
2. Open the **Sidebar**.
3. Use the **Admin Panel** to create new user accounts with custom usernames and passwords.
4. Share the credentials with users to grant them access.

## ☁️ Hosting on Fly.io (Recommended)

Fly.io is the best platform for this app because it supports persistent volumes (for SQLite) and handles WebSockets efficiently.

### Deployment Steps:
1. **Install Fly CLI**: [Install instructions](https://fly.io/docs/hands-on/install-cli/)
2. **Login**: `fly auth login`
3. **Launch**: `fly launch --no-deploy`
   - Select your region.
   - Say **Yes** to setting up a database (Postgres/Redis) if needed, but we use SQLite, so you can say **No**.
4. **Create Volume**: Create a persistent volume for the SQLite database:
   ```bash
   fly volumes create chat_data --region ewr --size 1
   ```
5. **Deploy**: `fly deploy`

---
Built with focus on Visual Excellence and Privacy.
