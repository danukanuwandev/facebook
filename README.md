# 📘 Facebook Login Clone

Facebook login page eka wagema interface ekak — Node.js backend + SQLite database.

---

## 📁 Folder Structure

```
facebook-login/
├── frontend/
│   └── index.html       ← Login UI (Facebook style)
└── backend/
    ├── server.js        ← Express API server
    ├── package.json     ← Dependencies
    └── database.db      ← SQLite DB (auto create wenawa)
```

---

## 🚀 Setup & Run

### Step 1 — Backend start karanna

```bash
cd backend
npm install
node server.js
```

Server port **3000** eke start wenawa.

---

### Step 2 — Frontend open karanna

Browser eke open karanna:
```
http://localhost:3000
```

*(Server eka frontend ekath serve karawa, direct file open karanda eppa)*

---

## 🔌 API Endpoints

| Method | Endpoint    | Description               |
|--------|-------------|---------------------------|
| POST   | /register   | New account hadanna       |
| POST   | /login      | Login karanna             |
| GET    | /users      | All users list (testing)  |
| DELETE | /users/:id  | User delete karanna       |

---

### Register — Body
```json
{
  "firstName": "Kasun",
  "lastName": "Perera",
  "email": "kasun@example.com",
  "password": "mypassword"
}
```

### Login — Body
```json
{
  "email": "kasun@example.com",
  "password": "mypassword"
}
```

---

## 🔒 Security Features

- Passwords **bcrypt** hash karala save wenawa (plain text naha!)
- Duplicate email check
- Min password length: 6 characters

---

## 🗄️ Database

SQLite `database.db` file eke `users` table:

| Column    | Type    | Description           |
|-----------|---------|-----------------------|
| id        | INTEGER | Auto increment        |
| firstName | TEXT    | First name            |
| lastName  | TEXT    | Last name             |
| email     | TEXT    | Unique email          |
| password  | TEXT    | Bcrypt hashed         |
| createdAt | TEXT    | Timestamp             |
