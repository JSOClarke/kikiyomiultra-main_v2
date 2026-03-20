import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set up external Directories (Decoupled from Repo)
const KIKIYOMI_DATA_ROOT = process.env.KIKIYOMI_DATA_ROOT || path.join(os.homedir(), 'Documents', 'KikiyomiUltraData');
const UPLOADS_DIR = path.join(KIKIYOMI_DATA_ROOT, 'uploads');
const DATA_DIR = path.join(KIKIYOMI_DATA_ROOT, 'data');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate a clean UUID-like filename alongside original extension
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

import { db } from './db';

// API Endpoints
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Kikiyomi Ultra Backend Online' });
});

// Library Listing
app.get('/api/books', (req, res) => {
  // Return the books minus massive blob payloads (strip coverBlob & audioBlob bytes from payload)
  const books = db.getBooks();
  
  // Clean heavy arrays from overview endpoint
  const manifest = books.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    type: b.type,
    coverUrl: b.coverUrl,
    duration: b.duration,
    splitByCommas: b.splitByCommas,
    createdAt: b.createdAt,
    savedIndex: b.savedIndex,
    savedTime: b.savedTime,
    totalSubtitles: b.subtitles ? b.subtitles.length : 0
  }));
  res.json(manifest);
});

// Specific Book Extraction
app.get('/api/books/:id', (req, res) => {
  const book = db.getBooks().find((b: any) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// Progress Sync
app.post('/api/sync/records', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.date) return res.status(400).json({ error: 'Invalid daily record payload' });
  
  db.updateDailyRecord(payload);
  res.json({ success: true, timestamp: Date.now() });
});

app.get('/api/sync/records', (req, res) => {
  res.json(db.getDailyRecords());
});

// Single file upload endpoint (EPUB, Audiobook, SRT)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Generate clean relative metadata map payload
  const pathUrl = `/uploads/${req.file.filename}`;
  
  res.json({ 
    message: 'File successfully uploaded', 
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: pathUrl,
    size: req.file.size
  });
});

// Multipart HTML5 Directory Pipeline for Mokuro OCR Manga
app.post('/api/upload/manga/folder', upload.array('files'), (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: 'No manga folder files detected' });
  }

  const files = req.files as Express.Multer.File[];
  
  // Locate the native Mokuro structural JSON map precisely
  const mokuroFile = files.find(f => f.originalname.endsWith('.mokuro') || f.originalname.endsWith('_ocr.json'));
  if (!mokuroFile) {
    // Clean up stranded multer buffers
    files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({ error: 'Missing .mokuro OCR JSON metadata inside directory.' });
  }

  try {
    const rawJson = fs.readFileSync(mokuroFile.path, 'utf-8');
    const mokuroData = JSON.parse(rawJson);

    // Physically allocate a dedicated volume directory decoupling from root uploads
    const mangaId = `manga_${Date.now()}`;
    const targetDir = path.join(UPLOADS_DIR, mangaId);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

    const mangaPages: any[] = [];
    const imageFiles = files.filter(f => f.originalname.match(/\.(jpg|jpeg|png|webp)$/i));

    // Map Images mathematically against the JSON structural array
    imageFiles.forEach(file => {
      // webkitdirectory preserves paths (e.g., 'Vol1/001.jpg'). Extract raw basename rigorously.
      const basename = path.basename(file.originalname);
      const newPath = path.join(targetDir, basename);
      
      // Relocate buffer out of temp into the isolated volume node
      fs.renameSync(file.path, newPath);

      // Mokuro maps coordinate blocks implicitly via numerical page index, but image basenames often contain numbers. 
      // To ensure maximum reliability, we just sort them exactly as the OS filesystem does later.
      mangaPages.push({
        imageUrl: `/uploads/${mangaId}/${basename}`,
        originalFilename: basename,
        ocrBlocks: [] // Will link synchronously underneath
      });
    });

    // Morph the JSON pages array over the sorted Image schemas explicitly
    mangaPages.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
    
    // Inject the raw Native Mokuro Bounding Boxes physically into our database model!
    if (mokuroData.pages && Array.isArray(mokuroData.pages)) {
      mokuroData.pages.forEach((pageData: any, i: number) => {
        if (mangaPages[i]) {
          mangaPages[i].ocrBlocks = pageData.blocks || [];
        }
      });
    }

    // Scaffold the core Backend Architecture primitive internally
    const mangaBook = {
      id: mangaId,
      title: mokuroData.title || 'Unknown Manga Volume',
      author: 'Mokuro OCR',
      type: 'manga',
      mangaPages: mangaPages,
      coverUrl: mangaPages.length > 0 ? mangaPages[0].imageUrl : '',
      savedIndex: 0,
      subtitles: [], // Enforce structurally empty array for legacy checks
      totalSubtitles: mangaPages.length, // Hack to repurpose the Progress Bar for pages!
      language: 'ja'
    };

    db.addBook(mangaBook);

    // Garbage collection for temp unused files (like the .json itself)
    files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });

    res.json({ success: true, bookId: mangaId });
  } catch (error) {
    console.error("Manga generation failed:", error);
    files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    res.status(500).json({ error: 'Server crashed processing the Mokuro DOM Map.' });
  }
});

// Complete Book Creation Payload (from worker)
app.post('/api/books', (req, res) => {
  const parsedBook = req.body;
  if (!parsedBook.id) return res.status(400).json({ error: 'Invalid book schema payload' });
  
  db.addBook(parsedBook);
  res.json({ success: true, bookId: parsedBook.id });
});

app.delete('/api/books/:id', (req, res) => {
  db.deleteBook(req.params.id);
  res.json({ success: true });
});

app.put('/api/books/:id/progress', (req, res) => {
  db.updateBookProgress(req.params.id, req.body);
  res.json({ success: true });
});

// Annotations Dictionary Endpoints
app.get('/api/books/:id/annotations', (req, res) => {
  res.json(db.getAnnotations(req.params.id));
});

app.post('/api/books/:id/annotations', (req, res) => {
  const { subtitleId, text } = req.body;
  if (!subtitleId) return res.status(400).json({ error: 'Missing subtitleId payload' });
  db.saveAnnotation(req.params.id, subtitleId, text || '');
  res.json({ success: true });
});

// Centralized User Analytics (Goals & History)
app.get('/api/user', (req, res) => {
  res.json(db.getUserData());
});

app.put('/api/user/goals', (req, res) => {
  db.updateGoals(req.body);
  res.json({ success: true });
});

app.put('/api/user/history', (req, res) => {
  db.addMiningHistory(req.body);
  res.json({ success: true });
});

app.put('/api/user/last-goal-date', (req, res) => {
  db.updateLastGoalMetDate(req.body.date);
  res.json({ success: true });
});

app.get('/api/user/timeline/dates', (req, res) => {
  res.json(db.getTimelineDates());
});

app.get('/api/user/timeline/:date', (req, res) => {
  res.json(db.getTimelineForDate(req.params.date));
});

// Bookmark Hub Integration
app.get('/api/user/bookmarks', (req, res) => {
  res.json(db.getBookmarks());
});

app.post('/api/user/bookmarks', (req, res) => {
  db.addBookmark(req.body);
  res.json({ success: true });
});

app.delete('/api/user/bookmarks/:id', (req, res) => {
  db.removeBookmark(req.params.id);
  res.json({ success: true });
});

// Static Media Serving - crucial for serving raw `.mp3` tracks
app.use('/uploads', express.static(UPLOADS_DIR));


// Start Engine
app.listen(PORT, () => {
  console.log(`[SERVER] Kikiyomi Ultra API running on http://localhost:${PORT}`);
});
