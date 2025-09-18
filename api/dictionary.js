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
      oxfordDef = oxJson[0]?.meanings?.map(m => m.definitions[0].definition).join("; ") || oxfordDef;
    } catch {}

    // ----- Free Dictionary -----
    let freeDefs = [];
    try {
      const freeApi = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const freeJson = await freeApi.json();
      freeDefs = freeJson[0]?.meanings?.map(m => m.definitions[0].definition) || [];
    } catch {}

    // ----- Thesaurus (Datamuse) -----
    let synonyms = [];
    try {
      const synRes = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`);
      const synJson = await synRes.json();
      synonyms = synJson.map(s => s.word);
      if (synonyms.length === 0) synonyms = ["No synonyms found"];
    } catch {}

    // ----- Urban Dictionary -----
    let urbanDefs = [];
    try {
      const urban = await fetch(`https://api.urbandictionary.com/v0/define?term=${word}`).then(r => r.json());
      urbanDefs = urban.list?.slice(0,3).map(d => d.definition) || [];
    } catch {}

    // ----- Wiktionary (English) -----
    let wikiDef = "No definition found";
    try {
      const wikiPage = await fetch(`https://en.wiktionary.org/wiki/${word}`).then(r => r.text());
      const $ = cheerio.load(wikiPage);
      const englishHeader = $("span#English").parent();
      let defs = [];
      englishHeader.nextAll("ol").each((i, el) => {
        const text = $(el).find("li").first().text().trim();
        if(text) defs.push(text);
      });
      wikiDef = defs[0] || wikiDef;
    } catch {}

    // ----- Cambridge -----
    let cambridgeDef = "No definition found";
    try {
      const camPage = await fetch(`https://dictionary.cambridge.org/dictionary/english/${word}`, { headers: { "User-Agent": "Mozilla/5.0" } }).then(r => r.text());
      const $c = cheerio.load(camPage);
      cambridgeDef = $c(".def.ddef_d.db").first().text().trim() || cambridgeDef;
    } catch {}

    // ----- Merriam-Webster -----
    let mwDef = "No definition found";
    try {
      const mwApiKey = process.env.MW_API_KEY; // set in Vercel env
      const mwRes = await fetch(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${mwApiKey}`);
      const mwJson = await mwRes.json();
      mwDef = mwJson[0]?.shortdef?.join("; ") || mwDef;
    } catch {}

    // ----- Hindi Dictionary (Shabdkosh) -----
    let hindiDef = "No Hindi definition found";
    try {
      const shabdkoshPage = await fetch(`https://www.shabdkosh.com/dictionary/english-hindi/${word}`).then(r => r.text());
      const $ = cheerio.load(shabdkoshPage);
      hindiDef = $(".dictionary_results div:first-child").text().trim() || hindiDef;
    } catch {}

    // ----- Urdu Dictionary (Rekhta / UrduPoint) -----
    let urduDef = "No Urdu definition found";
    try {
      const urduPage = await fetch(`https://www.urdupoint.com/dictionary/english-urdu/${word}.html`).then(r => r.text());
      const $ = cheerio.load(urduPage);
      urduDef = $(".meaning").first().text().trim() || urduDef;
    } catch {}

    // ----- Build HTML -----
    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family:'Roboto', sans-serif; padding:15px; background:#f2f2f2; line-height:1.5; }
          h1 { text-align:center; color:#2196F3; margin-bottom:15px; }
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

        <div class="card">
          <h2>Merriam-Webster</h2>
          <p>${mwDef}</p>
        </div>

        <div class="card">
          <h2>Hindi</h2>
          <p>${hindiDef}</p>
        </div>

        <div class="card">
          <h2>Urdu</h2>
          <p>${urduDef}</p>
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
