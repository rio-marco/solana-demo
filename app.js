'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');

const connectDatabase = require('./config/database');
const depositRoutes = require('./routes/deposit.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
};

app.use('/api/deposit', depositRoutes);

app.get('/', (req, res) => {
    res.render('home', {
        network: process.env.SOLANA_NETWORK || 'devnet',
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('[Global Error]', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

(async () => {
    await connectDatabase();
    app.listen(PORT, () => {
        console.log(`Solana Deposit Demo running on ${process.env.NODE_URL}`);
    });
})();

module.exports = app;
