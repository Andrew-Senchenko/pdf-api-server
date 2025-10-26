const express = require('express');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// PDF A4 параметры
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_TOP = 60;
const MARGIN_LEFT = 50;
const TITLE_FONT_SIZE = 20;
const TRACK_FONT_SIZE = 14;
const LINE_HEIGHT = 22;

function addTracksToPage(page, customFont, tracks, startIndex) {
  let y = PAGE_HEIGHT - MARGIN_TOP - TITLE_FONT_SIZE - 15;
  for (let i = 0; i < tracks.length; i++) {
    const idx = startIndex + i;
    const text = `${idx + 1}. ${tracks[i].title} — ${tracks[i].artist}`;
    page.drawText(text, {
      x: MARGIN_LEFT,
      y: y - LINE_HEIGHT * i,
      size: TRACK_FONT_SIZE,
      font: customFont,
    });
  }
}

async function generatePDFBuffer(tracks) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontPath = path.join(__dirname, 'public/fonts/Inter-V.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const customFont = await pdfDoc.embedFont(fontBytes);

  const tracksPerPage = Math.floor((PAGE_HEIGHT - MARGIN_TOP - 60) / LINE_HEIGHT);
  let trackIndex = 0;
  while (trackIndex < tracks.length) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText('Избранные треки:', {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - MARGIN_TOP,
      size: TITLE_FONT_SIZE,
      font: customFont,
    });

    const tracksThisPage = tracks.slice(trackIndex, trackIndex + tracksPerPage);
    addTracksToPage(page, customFont, tracksThisPage, trackIndex);
    trackIndex += tracksPerPage;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

app.get('/health', (req, res) => {
  res.status(200).send('ok');
});


app.use(cors());
app.use(express.json());

// POST: для обычных браузеров
app.post('/generate-pdf', async (req, res) => {
  try {
    const { tracks } = req.body;
    const pdfBuffer = await generatePDFBuffer(tracks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=favorites.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// GET: совместимость с браузерами мессенджеров
app.get('/generate-pdf', async (req, res) => {
  try {
    const tracksJson = req.query.tracks;
    if (!tracksJson) {
      return res.status(400).send('Параметр tracks обязателен');
    }
    const tracks = JSON.parse(decodeURIComponent(tracksJson));
    const pdfBuffer = await generatePDFBuffer(tracks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=favorites.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
