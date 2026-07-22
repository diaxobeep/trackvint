import express from 'express';
import authRoutes from '../src/routes/auth.routes.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path, method: req.method });
});

const server = app.listen(3010, async () => {
  const r = await fetch('http://127.0.0.1:3010/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@trackvint.local', password: 'demo' }),
  });
  console.log('STATUS', r.status);
  console.log('BODY', await r.text());
  server.close();
});
