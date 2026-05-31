import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import Services
import { dbService } from './services/db.js';
import { aiService } from './services/ai.js';
import { deployerService } from './services/deployer.js';
import { telemetryService } from './services/telemetry.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --- API ROUTES ---

// 1. Google Auth & Allowlist Gate
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const isAllowed = await dbService.isEmailAllowed(email);
    if (!isAllowed) {
      return res.status(403).json({ allowed: false, error: 'Access restricted. Email not in allowlist.' });
    }

    res.json({ allowed: true, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Allowlist Management
app.get('/api/allowlist', async (req, res) => {
  try {
    const list = await dbService.getAllowlist();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/allowlist', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await dbService.addEmailToAllowlist(email);
    res.json({ success: true, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/allowlist/:email', async (req, res) => {
  try {
    const { email } = req.params;
    await dbService.removeEmailFromAllowlist(email);
    res.json({ success: true, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Projects Routing
app.get('/api/projects', async (req, res) => {
  try {
    const { userId } = req.query; // in real app, extracted from session
    if (!userId) return res.status(400).json({ error: 'UserId is required' });

    const projects = await dbService.getUserProjects(userId);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'UserId and Project Name are required' });

    const project = await dbService.createProject(userId, name);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Conversational AI & Cloud Run Deployment Pipeline
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, projectId, message } = req.body;
    if (!userId || !projectId || !message) {
      return res.status(400).json({ error: 'Missing userId, projectId, or message' });
    }

    // A. Invoke AI to generate application code based on chat
    const { responseText, generatedCode, tokenUsage } = await aiService.generateAppCode(projectId, message);

    // B. Log AI token usage immediately in the telemetry database
    await telemetryService.logTokenUsage(userId, projectId, tokenUsage);

    // C. Trigger dynamic deployment on Cloud Run if code was generated
    let deployment = null;
    if (generatedCode) {
      deployment = await deployerService.deployApp(userId, projectId, generatedCode);
    }

    res.json({
      text: responseText,
      deployment: deployment ? {
        serviceName: deployment.serviceName,
        url: deployment.url,
        status: deployment.status
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Telemetry & Consumption Reporting
app.get('/api/telemetry', async (req, res) => {
  try {
    const { userId, projectId } = req.query;
    if (!userId) return res.status(400).json({ error: 'UserId is required' });

    const telemetry = await telemetryService.getMetrics(userId, projectId);
    res.json(telemetry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Zephyr Server running on port ${PORT}`);
});
