const express = require('express');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));
const port = process.env.PORT || 3000;

// PDF A4 параметры
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_TOP = 60;
const MARGIN_LEFT = 50;
const TITLE_FONT_SIZE = 20;
const TRACK_FONT_SIZE = 14;
const LINE_HEIGHT = 22;

// Временное хранилище для payload (id => tracks)
const payloadStorage = new Map();

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
    page.drawText('Выбранные треки:', {
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

app.use(cors());
app.use(express.json());

// POST: сохранить payload, вернуть короткий id
app.post('/store-pdf-payload', (req, res) => {
  try {
    const { tracks } = req.body;
    if (!Array.isArray(tracks)) {
      return res.status(400).json({ error: 'tracks must be array' });
    }

    const id = Math.random().toString(36).substr(2, 9);
    payloadStorage.set(id, tracks);

    res.json({ id, pdf_url: `/generate-pdf.pdf?id=${id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// для проверки состояния сервиса
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});



// Универсальный хендлер генерации PDF (использован в двух роутах)
async function sendPdf(req, res) {
  try {
    let tracks;
    if (req.query.id) {
      tracks = payloadStorage.get(req.query.id);
      if (!tracks) {
        return res.status(404).send('Не найдено');
      }
    } else if (req.query.tracks) {
      tracks = JSON.parse(decodeURIComponent(req.query.tracks));
    } else {
      return res.status(400).send('Не переданы треки!');
    }
    const pdfBuffer = await generatePDFBuffer(tracks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tracklist The Party!.pdf"');
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).send('Ошибка сервера');
  }
}

// GET: PDF по id или tracks (старый режим для совместимости)
app.get('/generate-pdf', sendPdf);
// Новый alias для .pdf — предпочтительно для мессенджеров и ссылок
app.get('/generate-pdf.pdf', sendPdf);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
