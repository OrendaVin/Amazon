const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

let users = [];
let ads = [];

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      users = data.users || [];
      ads = data.ads || [];
      console.log('📂 Данные успешно загружены из data.json');
    } catch (err) {
      console.error('⚠️ Ошибка чтения data.json:', err.message);
    }
  } else {
    saveData();
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, ads }, null, 2), 'utf8');
    console.log('💾 Изменения сохранены в data.json');
  } catch (err) {
    console.error('❌ Ошибка записи в data.json:', err.message);
  }
}

loadData();

/* ==================== API ПОЛЬЗОВАТЕЛЕЙ ==================== */

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
  }

  const role = users.length === 0 ? 'admin' : 'user';
  const newUser = { id: Date.now().toString(), name, email, password, role };

  users.push(newUser);
  saveData();

  res.json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/* ==================== API ТОВАРОВ И ОБЪЯВЛЕНИЙ ==================== */

app.get('/api/ads', (req, res) => {
  res.json(ads);
});

app.post('/api/ads', upload.single('image'), (req, res) => {
  try {
    const { title, category, subcategory, price, city, userId } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Укажите название и цену товара' });
    }

    const newAd = {
      id: Date.now().toString(),
      title,
      category: category || 'Электроника',
      subcategory: subcategory || 'Разное',
      price: Number(price) || 0,
      city: city || 'Не указан',
      userId: userId || 'anonymous',
      image: req.file ? `/uploads/${req.file.filename}` : 'https://via.placeholder.com/300',
      date: new Date().toLocaleDateString('ru-RU')
    };

    ads.push(newAd);
    saveData();

    res.json({ success: true, ad: newAd });
  } catch (err) {
    console.error('❌ Ошибка при добавлении товара:', err);
    res.status(500).json({ error: 'Не удалось сохранить товар' });
  }
});

/* ==================== API АДМИН-ПАНЕЛИ ==================== */

app.get('/api/admin/users', (req, res) => {
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
});

app.patch('/api/admin/users/:id/role', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (user) {
    user.role = req.body.role;
    saveData();
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Пользователь не найден' });
});

app.delete('/api/admin/users/:id', (req, res) => {
  users = users.filter(u => u.id !== req.params.id);
  saveData();
  res.json({ success: true });
});

app.delete('/api/admin/ads/:id', (req, res) => {
  ads = ads.filter(a => a.id !== req.params.id);
  saveData();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});