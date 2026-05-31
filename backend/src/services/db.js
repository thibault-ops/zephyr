import { Firestore } from '@google-cloud/firestore';
import fs from 'fs';
import path from 'path';

// Let's create a robust service that uses Google Cloud Firestore
// and falls back gracefully to local file storage for seamless local development.

class DbService {
  constructor() {
    this.useFirestore = false;
    const isProduction = process.env.NODE_ENV === 'production';
    this.localDbPath = process.env.LOCAL_DB_PATH || (isProduction ? path.resolve('/tmp', 'local_db.json') : path.resolve(process.cwd(), 'local_db.json'));
    this.initLocalDb();

    try {
      // Attempt to initialize Google Cloud Firestore client.
      // Firestore automatically uses current gcloud active credentials and project.
      this.firestore = new Firestore();
      this.useFirestore = true;
      console.log('📡 Connected to GCP Firestore Database service.');
    } catch (err) {
      console.warn('⚠️ Firestore initialization failed, falling back to local JSON database. Error:', err.message);
      this.useFirestore = false;
    }
  }

  // --- Local DB Fallback Helpers ---
  initLocalDb() {
    if (!fs.existsSync(this.localDbPath)) {
      const initialSchema = {
        allowlist: ['thibault@tibodata.com', 'admin@tibodata.com', 'thibault.lefevre@gmail.com'],
        projects: [],
        telemetry: []
      };
      fs.writeFileSync(this.localDbPath, JSON.stringify(initialSchema, null, 2));
    }
  }

  readLocalDb() {
    this.initLocalDb();
    return JSON.parse(fs.readFileSync(this.localDbPath, 'utf8'));
  }

  writeLocalDb(data) {
    fs.writeFileSync(this.localDbPath, JSON.stringify(data, null, 2));
  }

  // --- 1. Allowlist Operations ---
  async isEmailAllowed(email) {
    const sanitizedEmail = email.toLowerCase().trim();
    if (this.useFirestore) {
      try {
        const doc = await this.firestore.collection('allowlist').doc(sanitizedEmail).get();
        return doc.exists;
      } catch (error) {
        console.error('Firestore allowlist read failed, using local fallback:', error.message);
      }
    }
    
    const db = this.readLocalDb();
    return db.allowlist.includes(sanitizedEmail);
  }

  async getAllowlist() {
    if (this.useFirestore) {
      try {
        const snapshot = await this.firestore.collection('allowlist').get();
        const list = [];
        snapshot.forEach((doc) => list.push(doc.id));
        return list;
      } catch (error) {
        console.error('Firestore getAllowlist failed, using local fallback:', error.message);
      }
    }
    
    const db = this.readLocalDb();
    return db.allowlist;
  }

  async addEmailToAllowlist(email) {
    const sanitizedEmail = email.toLowerCase().trim();
    if (this.useFirestore) {
      try {
        await this.firestore.collection('allowlist').doc(sanitizedEmail).set({ addedAt: new Date().toISOString() });
        return;
      } catch (error) {
        console.error('Firestore addEmail failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    if (!db.allowlist.includes(sanitizedEmail)) {
      db.allowlist.push(sanitizedEmail);
      this.writeLocalDb(db);
    }
  }

  async removeEmailFromAllowlist(email) {
    const sanitizedEmail = email.toLowerCase().trim();
    if (this.useFirestore) {
      try {
        await this.firestore.collection('allowlist').doc(sanitizedEmail).delete();
        return;
      } catch (error) {
        console.error('Firestore removeEmail failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    db.allowlist = db.allowlist.filter((e) => e !== sanitizedEmail);
    this.writeLocalDb(db);
  }

  // --- 2. Projects Operations ---
  async getUserProjects(userId) {
    if (this.useFirestore) {
      try {
        const snapshot = await this.firestore.collection('projects').where('userId', '==', userId).get();
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        return list;
      } catch (error) {
        console.error('Firestore getUserProjects failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    return db.projects.filter((p) => p.userId === userId);
  }

  async getAllProjects() {
    if (this.useFirestore) {
      try {
        const snapshot = await this.firestore.collection('projects').get();
        const list = [];
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        return list;
      } catch (error) {
        console.error('Firestore getAllProjects failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    return db.projects;
  }

  async createProject(userId, name) {
    const projectId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const newProj = {
      userId,
      name,
      status: 'Created',
      url: `https://${projectId}.tibodata.com`,
      createdAt: new Date().toISOString(),
      latestCode: null
    };

    if (this.useFirestore) {
      try {
        await this.firestore.collection('projects').doc(projectId).set(newProj);
        return { id: projectId, ...newProj };
      } catch (error) {
        console.error('Firestore createProject failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    db.projects.push({ id: projectId, ...newProj });
    this.writeLocalDb(db);
    return { id: projectId, ...newProj };
  }

  async updateProjectCode(projectId, code) {
    if (this.useFirestore) {
      try {
        await this.firestore.collection('projects').doc(projectId).update({
          latestCode: code,
          status: 'Updating',
          updatedAt: new Date().toISOString()
        });
        return;
      } catch (error) {
        console.error('Firestore updateProjectCode failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    const proj = db.projects.find((p) => p.id === projectId);
    if (proj) {
      proj.latestCode = code;
      proj.status = 'Updating';
      proj.updatedAt = new Date().toISOString();
      this.writeLocalDb(db);
    }
  }

  async updateProjectStatus(projectId, status, url = null) {
    const updateData = { status, updatedAt: new Date().toISOString() };
    if (url) updateData.url = url;

    if (this.useFirestore) {
      try {
        await this.firestore.collection('projects').doc(projectId).update(updateData);
        return;
      } catch (error) {
        console.error('Firestore updateProjectStatus failed, using local fallback:', error.message);
      }
    }

    const db = this.readLocalDb();
    const proj = db.projects.find((p) => p.id === projectId);
    if (proj) {
      proj.status = status;
      if (url) proj.url = url;
      proj.updatedAt = new Date().toISOString();
      this.writeLocalDb(db);
    }
  }
}

export const dbService = new DbService();
export default dbService;
