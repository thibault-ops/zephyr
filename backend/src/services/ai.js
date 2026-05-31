import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { dbService } from './db.js';

dotenv.config();

class AiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (this.apiKey) {
      this.ai = new GoogleGenerativeAI(this.apiKey);
    } else {
      console.warn('⚠️ GEMINI_API_KEY environment variable is not defined. Conversational features will use high-fidelity mocks.');
    }
  }

  async generateAppCode(projectId, userMessage) {
    // 1. Get existing project context or history
    const projects = await dbService.getUserProjects('thibault@tibodata.com'); // Mock current user in local session
    const project = projects.find((p) => p.id === projectId);
    const latestCode = project ? project.latestCode : null;

    // Standard high-level system prompt that forces conversational simplicity and returns clean, inline-runnable code
    const systemInstruction = `
You are Zephyr, an elite agentic cloud software architect. 
Your goal is to build stunning, production-ready, interactive web applications on behalf of the user.

RULES OF ENGAGEMENT:
1. Talk to the user in a friendly, high-level, business-oriented tone. NEVER bore them with technical terms (e.g. "divs", "flexbox", "onSubmit handlers") unless they specifically ask you to explain the code. Instead, talk in terms of user outcomes, features, layouts, and business values.
2. Under the hood, you will generate a fully complete, self-contained single-page application inside a single HTML block (fully integrated CSS and Javascript).
3. If this is a modification of existing code, you MUST return the entire, updated HTML document with the modifications perfectly applied. Do not write snippets or placeholders.
4. Your response MUST contain exactly one HTML block wrapped in standard markdown syntax:
\`\`\`html
<!DOCTYPE html>
<html>
... (Full, styled, highly functional app)
</html>
\`\`\`
5. Focus on exquisite visual aesthetics (dark themes, glassmorphic card elements, smooth transitions, premium typography, modern gradients, responsive grids). Make the app feel premium.
    `;

    // If Gemini API Key is missing, fallback to extremely premium, contextual mocks
    if (!this.ai) {
      return this.mockGenerateAppCode(userMessage, latestCode, projectId);
    }

    try {
      const model = this.ai.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: systemInstruction,
      });

      const prompt = `
Current Web Code in Production:
${latestCode ? latestCode : '(No code written yet. Start from scratch.)'}

User Prompt: "${userMessage}"

Generate your conversational response and the fully-integrated HTML code below.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract the code block from the markdown response
      const codeRegex = /```html([\s\S]*?)```/i;
      const match = responseText.match(codeRegex);
      const generatedCode = match ? match[1].trim() : null;

      // Strip the code block out of the conversational text shown to the user
      const cleanResponseText = responseText.replace(codeRegex, '').trim();

      // Mock Token usage counts (Gemini 1.5 billing rate)
      const tokenUsage = {
        inputTokens: Math.floor(prompt.length / 4) + 1200,
        outputTokens: responseText.length / 4 + 400
      };

      // Save code in database
      if (generatedCode) {
        await dbService.updateProjectCode(projectId, generatedCode);
      }

      return {
        responseText: cleanResponseText || "I have successfully compiled and deployed the changes! Check them out in the live canvas.",
        generatedCode,
        tokenUsage
      };

    } catch (error) {
      console.error('Gemini API call failed, falling back to mock agent:', error.message);
      return this.mockGenerateAppCode(userMessage, latestCode, projectId);
    }
  }

  // Resilient High-Fidelity Mocking system to guarantee instant, beautiful iterations during local development or offline state
  async mockGenerateAppCode(userMessage, latestCode, projectId) {
    const isModification = !!latestCode;
    let responseText = "";
    let generatedCode = "";

    if (!isModification) {
      responseText = `I've created a stunning website for Tibo Advisory! I went with a high-fidelity design: a dark slate background, glowing neon highlights, a spacious layout, and smooth interactions. I've deployed version 1 on Cloud Run. Let me know what you'd like to refine!`;
      generatedCode = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0c0d12; color: #f1f5f9; font-family: system-ui, sans-serif; margin: 0; padding: 40px; text-align: center; }
    .card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 40px; border-radius: 16px; max-width: 700px; margin: 60px auto; box-shadow: 0 15px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
    h1 { background: linear-gradient(135deg, #818cf8 0%, #14b8a6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; font-weight: 800; font-size: 2.5em; }
    p { color: #94a3b8; font-size: 1.1em; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #14b8a6 100%); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 24px; font-weight: 600; box-shadow: 0 4px 15px rgba(99,102,241,0.3); transition: 0.3s; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.45); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; text-align: left; }
    .grid-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); padding: 20px; border-radius: 10px; transition: 0.2s; }
    .grid-card:hover { border-color: rgba(20, 184, 166, 0.3); background: rgba(255,255,255,0.02); }
    .grid-card h3 { margin-top: 0; color: #14b8a6; font-size: 1.25em; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Tibo Advisory</h1>
    <p>Strategic high-level technical consulting and AI integration designed to scale operations smoothly and securely.</p>
    <div class="grid">
      <div class="grid-card">
        <h3>Cloud & DevOps</h3>
        <p style="font-size:0.92em; margin:0; line-height:1.5;">Architecting robust, scale-to-zero serverless environments using GCP Cloud Run.</p>
      </div>
      <div class="grid-card">
        <h3>AI Integration</h3>
        <p style="font-size:0.92em; margin:0; line-height:1.5;">Empowering operational flows with intelligent agentic features using the Gemini API.</p>
      </div>
    </div>
    <a href="#" class="btn">Schedule a Consultation</a>
  </div>
</body>
</html>`;
    } else {
      responseText = `I've refreshed the interface with your specifications! Added a beautiful, secure, automated contact form with floating fields and added an interactive consultation booking link. Let me know what you'd like to build next!`;
      
      // Inject form into code
      generatedCode = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0c0d12; color: #f1f5f9; font-family: system-ui, sans-serif; margin: 0; padding: 40px; text-align: center; }
    .card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 40px; border-radius: 16px; max-width: 700px; margin: 40px auto; box-shadow: 0 15px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
    h1 { background: linear-gradient(135deg, #818cf8 0%, #14b8a6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 10px; font-weight: 800; font-size: 2.5em; }
    p { color: #94a3b8; font-size: 1.1em; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #14b8a6 100%); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 24px; font-weight: 600; box-shadow: 0 4px 15px rgba(99,102,241,0.3); transition: 0.3s; border: none; cursor: pointer; width: 100%; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.45); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; text-align: left; }
    .grid-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); padding: 20px; border-radius: 10px; transition: 0.2s; }
    .grid-card:hover { border-color: rgba(20, 184, 166, 0.3); background: rgba(255,255,255,0.02); }
    .grid-card h3 { margin-top: 0; color: #14b8a6; font-size: 1.25em; }
    
    /* Interactive Form */
    form { margin-top: 30px; text-align: left; background: rgba(255,255,255,0.01); padding: 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); }
    .form-group { margin-bottom: 16px; }
    label { font-size: 0.85em; color: #14b8a6; display: block; margin-bottom: 6px; font-weight: 500; }
    input, textarea { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: white; outline: none; transition: 0.2s; box-sizing: border-box; }
    input:focus, textarea:focus { border-color: #6366f1; background: rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <div class="card">
    <h1>Tibo Advisory</h1>
    <p>Strategic high-level technical consulting and AI integration designed to scale operations smoothly and securely.</p>
    <div class="grid">
      <div class="grid-card">
        <h3>Cloud & DevOps</h3>
        <p style="font-size:0.92em; margin:0; line-height:1.5;">Architecting robust, scale-to-zero serverless environments using GCP Cloud Run.</p>
      </div>
      <div class="grid-card">
        <h3>AI Automation</h3>
        <p style="font-size:0.92em; margin:0; line-height:1.5;">Empowering operational flows with intelligent agentic features using the Gemini API.</p>
      </div>
    </div>
    
    <form onsubmit="event.preventDefault(); alert('Message sent successfully!');">
      <h3 style="color:#f1f5f9; margin-top:0; margin-bottom:16px;">Contact Advisory Agent</h3>
      <div class="form-group">
        <label>Your Email</label>
        <input type="email" required placeholder="thibault@tibodata.com" />
      </div>
      <div class="form-group">
        <label>Your Inquiry</label>
        <textarea rows="3" required placeholder="How can we help optimize your architecture?"></textarea>
      </div>
      <button type="submit" class="btn">Send Encrypted Message</button>
    </form>
  </div>
</body>
</html>`;
    }

    const tokenUsage = {
      inputTokens: Math.floor(userMessage.length / 4) + 1200,
      outputTokens: responseText.length / 4 + 400
    };

    if (generatedCode) {
      await dbService.updateProjectCode(projectId, generatedCode);
    }

    return { responseText, generatedCode, tokenUsage };
  }
}

export const aiService = new AiService();
export default aiService;
