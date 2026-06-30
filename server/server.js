const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Log file path
const LOG_FILE = path.join(__dirname, 'logs.json');

// Ensure log file exists
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([]));
}

// API Routes
app.post('/api/log', (req, res) => {
    const { timestamp, message, type } = req.body;

    if (!timestamp || !message) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    const logEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp,
        message,
        type,
        receivedAt: new Date().toISOString()
    };

    // Append to file (naive approach: read, parse, push, write)
    // For production, use a DB or append-only stream.
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error("Read error", err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        let logs = [];
        try {
            logs = JSON.parse(data);
        } catch (e) {
            logs = [];
        }

        logs.push(logEntry);

        // Keep last 1000 logs
        if (logs.length > 1000) logs = logs.slice(-1000);

        fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), (err) => {
            if (err) {
                console.error("Write error", err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            console.log(`[Log] ${type}: ${message}`);
            res.json({ success: true });
        });
    });
});

app.get('/api/logs', (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Read error' });
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.json([]);
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Serving frontend from ${path.join(__dirname, '../public')}`);
});
