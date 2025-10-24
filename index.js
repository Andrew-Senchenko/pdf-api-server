const express = require('express');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Статический файлы (шрифты etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// Ваш текущий POST-ендпоинт (оставьте его без изменений)
app.post('/generate-pdf', async (req, res) => {
  try {
    const { tracks } = req.body;
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontPath = path.join(__dirname, 'public/fonts/Inter-V.ttf');
    const fontBytes = fs.readFileSync(fontPath);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const page = pdfDoc.addPage([500, 30 + 25 * (tracks.length || 1)]);
    let y = page.getHeight() - 30;

    page.drawText('Избранные треки:', {
      x: 50,
      y,
      size: 20,
      font: customFont
    });
    y -= 30;

    tracks.forEach((track, i) => {
      const text = `${i + 1}. ${track.title} — ${track.artist}`;
      page.drawText(text, { x: 50, y, size: 14, font: customFont });
      y -= 20;
    });
    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=favorites.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Новый GET-ендпоинт для поддержки мессенджеров
app.get('/generate-pdf', async (req, res) => {
  try {
    const tracksJson = req.query.tracks;
    if (!tracksJson) {
      return res.status(400).send('Параметр tracks обязателен');
    }
    const tracks = JSON.parse(decodeURIComponent(tracksJson));
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontPath = path.join(__dirname, 'public/fonts/Inter-V.ttf');
    const fontBytes = fs.readFileSync(fontPath);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const page = pdfDoc.addPage([500, 30 + 25 * (tracks.length || 1)]);
    let y = page.getHeight() - 30;

    page.drawText('Избранные треки:', {
      x: 50,
      y,
      size: 20,
      font: customFont
    });
    y -= 30;

    tracks.forEach((track, i) => {
      const text = `${i + 1}. ${track.title} — ${track.artist}`;
      page.drawText(text, { x: 50, y, size: 14, font: customFont });
      y -= 20;
    });
    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=favorites.pdf');
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Старт сервера
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
