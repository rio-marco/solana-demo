'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const { Server } = require('socket.io');

const constants = require('./config/constant');
const connectDatabase = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const depositRoutes = require('./routes/deposit.routes');
const withdrawRoutes = require('./routes/withdraw.routes');
const transactionRoutes = require('./routes/transaction.routes');
const notificationRoutes = require('./routes/notification.routes');
const authMiddleware = require('./middleware/auth.middleware');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.set('io', io);

io.on('connection', (socket) => {
    socket.on('joinRoom', (room) => {
        if (room) {
            socket.join(room);
        }
    });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const parsedUrl = new URL(process.env.NODE_URL);

const sessionConfig = {
    name: constants.PLATFORM_NAME,
    secret: process.env.SESSION_SECRET,
    resave: false,
    proxy: true,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV !== "local",
        domain: parsedUrl.hostname,
        sameSite: "Lax",
        maxAge: constants.SESSION_MAX_AGE,
    },
};

app.use(session(sessionConfig));

if (process.env.NODE_ENV !== 'live') {
    app.use(morgan('dev'));
}

// Register Web Page & Auth Routes
app.use('/', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/transaction', transactionRoutes);

// Dashboard Route (Protected)
app.get('/', authMiddleware, (req, res) => {
    res.render('home', {
        user: req.user,
        network: process.env.SOLANA_NETWORK || 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    });
});

app.use((req, res) => {
    if (req.accepts('html')) {
        return res.status(404).render('login', { error: 'Page not found' });
    }
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('[Global Error]', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

(async () => {
    await connectDatabase();
    server.listen(PORT, () => {
        console.log(`Solana System running on ${process.env.NODE_URL || 'http://localhost:' + PORT}`);
    });
})();

module.exports = app;
