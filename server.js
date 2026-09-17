const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Мідлвари
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Перевірка та автоматичне створення папки uploads
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// 1. ПІДКТЮЧЕННЯ ДО MONGODB ATLAS
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ База даних MongoDB Atlas успішно підключена!'))
  .catch((err) => console.error('❌ Помилка підключення до MongoDB:', err));

// 2. СХЕМА ТА МОДЕЛЬ ТОВАРУ
const listingSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  weight: Number,
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Listing = mongoose.model('Listing', listingSchema);

// 3. НАЛАШТУВАННЯ MULTER ДЛЯ КАРТИНОК
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 4. МАРШРУТИ (ROUTES)

// Отримати всі товари
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання даних' });
  }
});

// Додати новий товар
app.post('/api/listings', upload.single('image'), async (req, res) => {
  try {
    const newListing = new Listing({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      weight: req.body.weight,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : ''
    });

    await newListing.save();
    res.status(201).json(newListing);
  } catch (err) {
    res.status(500).json({ error: 'Помилка збереження товару' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});