import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { word } = req.query;
  if (!word) return res.status(400).send("Missing 'word'");

  try {
    // ----- Oxford -----
    let oxfordDef = "No definition found";
    try {
      const ox = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const oxJson = await ox.json();
      oxfordDef = oxJson[0]?.meanings?.map(m => m.definitions[0].definition).join('; ') || oxfordDef;
    } catch {}

    // ----- Free Dictionary (dictionaryapi.dev) -----
    let freeDefs = [];
    try {
      const freeApi = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const freeJson = await freeApi.json();
      freeDefs = freeJson[0]?.meanings?.map(m => m.definitions[0].definition) || [];
    } catch {}

    // ----- Thesaurus / Synonyms (Datamuse) -----
    let synonyms = [];
    try {
      const synRes = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`);
      const synJson = await synRes.json();
      synonyms = synJson.map(s => s.word);
      if (synonyms.length === 0) synonyms = ["No synonyms found"];
    } catch {}

    // ----- Urban Dictionary (slang) -----
    let urbanDefs = [];
    try {
      const urban = await fetch(`https://api.urbandictionary.com/v0/define?term=${word}`).then(r => r.json());
      urbanDefs = urban.list?.slice(0,3).map(d => d.definition) || [];
    } catch {}

    // ----- Wiktionary (scrape HTML) -----
    let wikiDef = "No definition found";
    try {
      const wikiPage = await fetch(`https://en.wiktionary.org/wiki/${word}`).then(r => r.text());
      const $ = cheerio.load(wikiPage);
      wikiDef = $("ol li").first().text().trim() || wikiDef;
    } catch {}

    // ----- Cambridge (scrape) -----
    let cambridgeDef = "No definition found";
    try {
      const camPage = await fetch(`https://dictionary.cambridge.org/dictionary/english/${word}`, { headers: { "User-Agent": "Mozilla/5.0" } }).then(r => r.text());
      const $c = cheerio.load(camPage);
      cambridgeDef = $c(".def.ddef_d.db").first().text().trim() || cambridgeDef;
    } catch {}

    // ----- Combine into modern HTML -----
    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family:'Roboto', sans-serif; padding:15px; background:#f2f2f2; line-height:1.5; }
          h1 { text-align:center; color:#2196F3; }
          .card { background:white; padding:15px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.2); margin:10px 0; }
          .card h2 { color:#333; margin-bottom:8px; }
          .card p { color:#555; }
          .synonyms li { display:inline-block; background:#e0f7fa; margin:3px; padding:5px 10px; border-radius:8px; font-size:0.9em; }
        </style>
      </head>
      <body>
        <h1>${word}</h1>

        <div class="card">
          <h2>Oxford</h2>
          <p>${oxfordDef}</p>
        </div>

        <div class="card">
          <h2>Free Dictionary</h2>
          ${freeDefs.map(d => `<p>${d}</p>`).join('')}
        </div>

        <div class="card">
          <h2>Thesaurus (Synonyms)</h2>
          <ul class="synonyms">${synonyms.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>

        <div class="card">
          <h2>Urban Dictionary</h2>
          ${urbanDefs.map(d => `<p>${d}</p>`).join('')}
        </div>

        <div class="card">
          <h2>Wiktionary</h2>
          <p>${wikiDef}</p>
        </div>

        <div class="card">
          <h2>Cambridge</h2>
          <p>${cambridgeDef}</p>
        </div>
      </body>
    </html>
    `;

    res.status(200).send(html);
  } catch(err) {
    console.error(err);
    res.status(500).send("Failed to fetch word data");
  }
}
