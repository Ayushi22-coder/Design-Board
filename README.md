# Design Board Website – Full Stack

## Project Structure
```
design-board/
├── public/
│   ├── index.html      <- Main website
│   ├── admin.html      <- Admin panel
│   ├── css/style.css
│   └── js/main.js
├── server/
│   └── server.js       <- Express backend
├── .env                <- Copy from .env.example and fill
├── .env.example
├── package.json
└── README.md
```

## Quick Start

1. Install Node.js from nodejs.org
2. Run: npm install
3. Copy .env.example to .env and fill in your Gmail App Password
4. Run: npm start
5. Open: http://localhost:3000
6. Admin: http://localhost:3000/admin (user: admin, pass: from .env)

## Gmail App Password Setup
1. myaccount.google.com → Security → 2-Step Verification → App Passwords
2. Generate for Mail → copy the 16-char password
3. Paste in EMAIL_PASS in your .env file

## Deploy to GoDaddy
1. cPanel → Node.js App → set startup file: server/server.js
2. Upload all files via FTP
3. Add env variables in cPanel
4. Run npm install and start the app

See full instructions in the README. Contact: designboard.agra@gmail.com
