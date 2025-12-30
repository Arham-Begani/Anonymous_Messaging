# Anonymous Messaging Platform

## Setup Instructions

### 1. Database Setup (PostgreSQL)
1. Ensure PostgreSQL is installed and running.
2. Create a database named `anonymous_chat`.
3. Run the schema script to create tables and seed a test password:
   ```bash
   psql -d anonymous_chat -f server/schema.sql
   ```
   *Alternatively, copy the content of `server/schema.sql` and run it in your SQL tool.*
   
   **Default Test Password:** `password123`

### 2. Server Setup
1. Open a terminal in `server/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env`:
   - Edit `.env` and update `DATABASE_URL` with your PostgreSQL credentials.
4. Start the server:
   ```bash
   npm start
   ```

### 3. Client Setup
1. Open a terminal in `client/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### 4. Usage
- Open the browser at `http://localhost:5173`.
- Enter any Name (e.g. `Agent007`).
- Enter the Password `password123` (or any other hash you added to the DB).
- Start chatting!

## Features
- **Security**: Passwords are hashed. Concurrent logins with the same password are blocked.
- **Anonymity**: No names displayed in chat.
- **UI**: Premium Dark Mode with Neon accents.
- **Real-time**: Socket.IO powered messaging.
