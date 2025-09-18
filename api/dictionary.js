import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { word } = req.query;
  if (!word) return res.status(400).send("Missing 'word' parameter");

  let oxfordDef = "No definition found";
  let collinsDef = "No definition found";
  let synonyms = [];

  try {
    // Oxford via API
    const ox = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (ox.ok) {
      const oxJson = await ox.json();
      oxfordDef = oxJson[0]?.meanings?.[0]?.definitions?.[0]?.definition || oxfordDef;
    }

    // Collins scraping fallback
    try {
      const collinsPage = await fetch(`https://www.collinsdictionary.com/dictionary/english/${word}`, { headers: { "User-Agent": "Mozilla/5.0" } })
        .then(r => r.text());
      const $c = cheerio.load(collinsPage);
      collinsDef = $c(".def").first().text().trim() || $c(".definition").first().text().trim() || collinsDef;
    } catch {}

    // Thesaurus synonyms via Datamuse API
    try {
      const synRes = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`);
      const synJson = await synRes.json();
      synonyms = synJson.map(s => s.word);
      if (synonyms.length === 0) synonyms = ["No synonyms found"];
    } catch {}

    // Build combined HTML
    const html = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial; padding: 15px; line-height:1.5; }
          h2 { margin-top:20px; color:#2196F3; }
          ul { padding-left: 20px; }
        </style>
      </head>
      <body>
        <h1>Word: ${word}</h1>
        <h2>Oxford Definition</h2><p>${oxfordDef}</p>
        <h2>Collins Definition</h2><p>${collinsDef}</p>
        <h2>Synonyms (Thesaurus)</h2>
        <ul>${synonyms.map(s => `<li>${s}</li>`).join('')}</ul>
      </body>
      </html>
    `;
    res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch word data");
  }
}
