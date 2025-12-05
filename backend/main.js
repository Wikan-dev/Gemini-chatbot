import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Generative AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Daftar model yang tersedia
const AVAILABLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash'
];

// Route untuk menerima pesan dari frontend dan mengirim ke Gemini API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'gemini-2.5-flash' } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Pesan tidak boleh kosong',
        errorCode: 'EMPTY_MESSAGE',
      });
    }

    // Validasi model
    if (!AVAILABLE_MODELS.includes(model)) {
      return res.status(400).json({
        success: false,
        error: 'Model tidak tersedia',
        errorCode: 'INVALID_MODEL',
      });
    }

    // Panggil Gemini API dengan model yang dipilih
    const response = await genAI.models.generateContent({
      model: model,
      contents: message,
    });

    const text = response.text;

    return res.json({
      success: true,
      reply: text,
    });
  } catch (error) {
    console.error('Error:', error);
    
    // Deteksi jenis error dan berikan pesan yang sesuai
    let errorMessage = 'Terjadi kesalahan saat memproses request';
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;

    const errorStr = error.message?.toLowerCase() || '';

    // Check untuk berbagai jenis error
    if (errorStr.includes('quota') || errorStr.includes('exhausted') || errorStr.includes('rate limit')) {
      errorMessage = 'Gemini sedang full, coba lagi nanti';
      errorCode = 'QUOTA_EXCEEDED';
      statusCode = 429;
    } else if (errorStr.includes('api key') || errorStr.includes('invalid') || errorStr.includes('unauthenticated')) {
      errorMessage = 'API Key tidak valid atau expired';
      errorCode = 'API_KEY_INVALID';
      statusCode = 401;
    } else if (errorStr.includes('blocked') || errorStr.includes('safety') || errorStr.includes('harmful')) {
      errorMessage = 'Konten yang Anda kirim tidak dapat diproses (berisi konten yang tidak sesuai)';
      errorCode = 'CONTENT_BLOCKED';
      statusCode = 400;
    } else if (errorStr.includes('timeout') || errorStr.includes('deadline')) {
      errorMessage = 'Request timeout, coba lagi nanti';
      errorCode = 'TIMEOUT';
      statusCode = 408;
    } else if (errorStr.includes('network') || errorStr.includes('connection')) {
      errorMessage = 'Koneksi ke server Gemini gagal';
      errorCode = 'NETWORK_ERROR';
      statusCode = 503;
    } else if (errorStr.includes('model') || errorStr.includes('not found')) {
      errorMessage = 'Model Gemini tidak tersedia';
      errorCode = 'MODEL_NOT_FOUND';
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      errorCode: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server berjalan dengan baik' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`✅ Listening on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
