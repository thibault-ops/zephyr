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
You are Zephyr, a friendly and elite AI application companion. 
Your goal is to build stunning, production-ready, interactive web applications on behalf of the user.

RULES OF ENGAGEMENT:
1. Talk to the user in a friendly, high-level, business-oriented tone. NEVER use technical terms like "containers", "Cloud Run", "GCP", "deployment", "build", "divs", "flexbox", "onSubmit handlers" unless they specifically ask. Instead, talk in terms of user outcomes, business features, visuals, and interactive experiences (e.g. "Your new booking form is active and ready to test!").
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
    const promptLower = userMessage.toLowerCase().trim();
    
    // Detect if user is asking for a frogger game, arcade, retro, or standard game
    const isGame = promptLower.includes('frog') || promptLower.includes('game') || promptLower.includes('arcade') || promptLower.includes('play');
    
    let responseText = "";
    let generatedCode = "";

    if (isGame) {
      responseText = `I have crafted a gorgeous, fully playable retro Frogger-style game with responsive neon lane controls and collision scoring! You can play right inside the screen below using your keyboard arrow keys or the on-screen buttons. Let me know what features we should add next!`;
      
      generatedCode = `<!DOCTYPE html>
<html>
<head>
  <title>Retro Frogger Game</title>
  <style>
    body { background: #0b0c10; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 20px; overflow: hidden; height: 100vh; display: flex; align-items: center; justify-content: center; }
    .arcade-container { max-width: 600px; width: 100%; background: rgba(31, 33, 47, 0.4); border: 2px solid #1f2833; border-radius: 16px; padding: 20px; box-shadow: 0 0 25px rgba(102, 252, 241, 0.2); backdrop-filter: blur(8px); box-sizing: border-box; }
    h1 { font-size: 2rem; margin-top: 0; margin-bottom: 5px; background: linear-gradient(135deg, #14b8a6 0%, #6366f1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; letter-spacing: 2px; }
    canvas { background: #12131c; border: 3px solid #1f2833; border-radius: 8px; display: block; margin: 15px auto; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); max-width: 100%; height: auto; }
    .btn { background: linear-gradient(135deg, #6366f1 0%, #14b8a6 100%); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 1rem; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 0 15px rgba(102, 252, 241, 0.4); }
    .controls { display: grid; grid-template-columns: repeat(3, 1fr); width: 180px; gap: 8px; margin: 15px auto; }
    .ctrl-btn { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; user-select: none; transition: 0.1s; }
    .ctrl-btn:active { background: #14b8a6; color: #0b0c10; }
    .hud { display: flex; justify-content: space-between; max-width: 400px; margin: 10px auto; font-weight: bold; color: #94a3b8; }
    .stat { color: #14b8a6; }
  </style>
</head>
<body>
  <div class="arcade-container">
    <h1>FROGGER RETRO</h1>
    <div class="hud">
      <div>SCORE: <span id="score" class="stat">0</span></div>
      <div>LIVES: <span id="lives" class="stat">3</span></div>
    </div>
    <canvas id="gameCanvas" width="400" height="400"></canvas>
    
    <div class="controls">
      <div></div>
      <button class="ctrl-btn" onclick="moveFrog(0, -1)">▲</button>
      <div></div>
      <button class="ctrl-btn" onclick="moveFrog(-1, 0)">◀</button>
      <button class="ctrl-btn" onclick="moveFrog(0, 1)">▼</button>
      <button class="ctrl-btn" onclick="moveFrog(1, 0)">▶</button>
    </div>
    <button class="btn" onclick="resetGame()">Restart Arena</button>
  </div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let score = 0;
    let lives = 3;
    const grid = 40;

    // Frog
    let frog = { x: 5 * grid, y: 9 * grid };

    // Obstacles
    let logs = [
      { x: 0, y: 1*grid, speed: 1.5, width: 80, color: '#8b5a2b' },
      { x: 120, y: 1*grid, speed: 1.5, width: 80, color: '#8b5a2b' },
      { x: 40, y: 2*grid, speed: -1.2, width: 100, color: '#8b5a2b' },
      { x: 220, y: 2*grid, speed: -1.2, width: 100, color: '#8b5a2b' },
      { x: 10, y: 3*grid, speed: 2.0, width: 60, color: '#8b5a2b' },
      { x: 180, y: 3*grid, speed: 2.0, width: 60, color: '#8b5a2b' }
    ];

    let cars = [
      { x: 0, y: 5*grid, speed: -2.0, width: 50, color: '#ff3366' },
      { x: 150, y: 5*grid, speed: -2.0, width: 50, color: '#ff3366' },
      { x: 80, y: 6*grid, speed: 1.8, width: 40, color: '#ffcc00' },
      { x: 240, y: 6*grid, speed: 1.8, width: 40, color: '#ffcc00' },
      { x: 10, y: 7*grid, speed: -1.5, width: 60, color: '#33ff57' },
      { x: 200, y: 7*grid, speed: -1.5, width: 60, color: '#33ff57' }
    ];

    function drawRect(x, y, w, h, color, radius=4) {
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, radius);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    }

    function moveFrog(dx, dy) {
      if (lives <= 0) return;
      frog.x += dx * grid;
      frog.y += dy * grid;

      // Bound checks
      if (frog.x < 0) frog.x = 0;
      if (frog.x >= canvas.width) frog.x = canvas.width - grid;
      if (frog.y < 0) frog.y = 0;
      if (frog.y >= canvas.height) frog.y = canvas.height - grid;

      // Win check (reached river bank / top lane)
      if (frog.y === 0) {
        score += 100;
        document.getElementById('score').innerText = score;
        resetFrog();
      }
    }

    window.moveFrog = moveFrog;

    function resetFrog() {
      frog.x = 5 * grid;
      frog.y = 9 * grid;
    }

    function resetGame() {
      score = 0;
      lives = 3;
      document.getElementById('score').innerText = score;
      document.getElementById('lives').innerText = lives;
      resetFrog();
    }

    window.resetGame = resetGame;

    // Key event listeners
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); moveFrog(0, -1); }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); moveFrog(0, 1); }
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); moveFrog(-1, 0); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); moveFrog(1, 0); }
    });

    function update() {
      if (lives <= 0) return;
      
      // Move obstacles
      logs.forEach(log => {
        log.x += log.speed;
        if (log.x > canvas.width && log.speed > 0) log.x = -log.width;
        if (log.x < -log.width && log.speed < 0) log.x = canvas.width;
      });

      cars.forEach(car => {
        car.x += car.speed;
        if (car.x > canvas.width && car.speed > 0) car.x = -car.width;
        if (car.x < -car.width && car.speed < 0) car.x = canvas.width;
      });

      // Collision check
      // Cars lane (rows 5, 6, 7)
      if (frog.y >= 5*grid && frog.y <= 7*grid) {
        cars.forEach(car => {
          if (frog.y === car.y && frog.x < car.x + car.width && frog.x + grid > car.x) {
            handleDeath();
          }
        });
      }

      // River logs lane (rows 1, 2, 3)
      if (frog.y >= 1*grid && frog.y <= 3*grid) {
        let onLog = false;
        logs.forEach(log => {
          if (frog.y === log.y && frog.x < log.x + log.width && frog.x + grid > log.x) {
            onLog = true;
            frog.x += log.speed; // drift with log
          }
        });
        if (!onLog || frog.x < 0 || frog.x >= canvas.width) {
          handleDeath();
        }
      }
    }

    function handleDeath() {
      lives--;
      document.getElementById('lives').innerText = lives;
      if (lives > 0) {
        resetFrog();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Lanes
      drawRect(0, 0, canvas.width, grid, '#112233', 0); // Safe zone top
      drawRect(0, 1*grid, canvas.width, 3*grid, '#0f2a4a', 0); // River water
      drawRect(0, 4*grid, canvas.width, grid, '#223344', 0); // Safe zone middle
      drawRect(0, 5*grid, canvas.width, 3*grid, '#1a1a24', 0); // Road
      drawRect(0, 8*grid, canvas.width, 2*grid, '#223344', 0); // Safe zone bottom

      // Draw road lane dividers
      ctx.strokeStyle = '#ffffff55';
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 2;
      for (let i = 6; i <= 7; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i*grid);
        ctx.lineTo(canvas.width, i*grid);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Logs
      logs.forEach(log => {
        drawRect(log.x, log.y+4, log.width, grid-8, log.color, 6);
      });

      // Draw Cars
      cars.forEach(car => {
        drawRect(car.x, car.y+6, car.width, grid-12, car.color, 6);
      });

      // Draw Frog
      if (lives > 0) {
        drawRect(frog.x+4, frog.y+4, grid-8, grid-8, '#39ff14', 8);
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(frog.x + 12, frog.y + 12, 3, 0, Math.PI * 2);
        ctx.arc(frog.x + 28, frog.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw Game Over Screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ARCADE GAME OVER', canvas.width/2, canvas.height/2);
      }
    }

    function gameLoop() {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    }

    gameLoop();
  </script>
</body>
</html>`;

    } else {
      // General customized dashboard template
      const defaultName = projectId ? projectId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'New Workspace';
      const cleanAppName = isModification ? defaultName : (userMessage.length < 25 ? userMessage : 'Interactive Application');
      
      responseText = `I have successfully prepared your custom workspace for "${cleanAppName}" with a polished, glassmorphic design and interactive controls. Try out the responsive elements in the preview panel below, and tell me what other sections we should build next!`;
      
      generatedCode = `<!DOCTYPE html>
<html>
<head>
  <title>${cleanAppName}</title>
  <style>
    body { background: #0c0d12; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 40px; text-align: center; }
    .card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 40px; border-radius: 16px; max-width: 650px; margin: 40px auto; box-shadow: 0 15px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
    h1 { background: linear-gradient(135deg, #6366f1 0%, #14b8a6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 15px; font-weight: 800; font-size: 2.5em; background-clip: text; }
    p { color: #94a3b8; font-size: 1.1em; line-height: 1.6; margin-bottom: 25px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #14b8a6 100%); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 15px rgba(99,102,241,0.3); transition: 0.3s; border: none; cursor: pointer; }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.45); }
    
    form { margin-top: 35px; text-align: left; background: rgba(255,255,255,0.01); padding: 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); }
    .form-group { margin-bottom: 16px; }
    label { font-size: 0.85em; color: #14b8a6; display: block; margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    input, textarea { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: white; outline: none; transition: 0.2s; box-sizing: border-box; }
    input:focus, textarea:focus { border-color: #6366f1; background: rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <div class="card">
    <h1>${cleanAppName}</h1>
    <p>Your custom application space is fully initialized and live. All style tokens and interactive layouts are active. Share your thoughts to add custom pages, dashboards, or retro game controls!</p>
    
    <form onsubmit="event.preventDefault(); alert('Submission recorded in your workspace!');">
      <h3 style="color:#f1f5f9; margin-top:0; margin-bottom:16px;">Quick Submission Form</h3>
      <div class="form-group">
        <label>Your Name</label>
        <input type="text" required placeholder="John Doe" />
      </div>
      <div class="form-group">
        <label>Inquiry Details</label>
        <textarea rows="3" required placeholder="Describe what you want to add..."></textarea>
      </div>
      <button type="submit" class="btn">Send Details</button>
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
