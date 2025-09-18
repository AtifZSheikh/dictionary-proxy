import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

// --------- Puppeteer Scraping Functions ---------
async function fetchWiktionary(word){
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`https://en.wiktionary.org/wiki/${word}`, { waitUntil: 'networkidle2' });

    const def = await page.evaluate(() => {
      const englishHeader = document.querySelector('span#English')?.parentElement;
      if(!englishHeader) return null;
      let el = englishHeader.nextElementSibling;
      while(el && el.tagName !== 'H2'){
        if(el.tagName === 'OL'){
          const li = el.querySelector('li');
          if(li) return li.innerText.trim();
        }
        el = el.nextElementSibling;
      }
      return null;
    });

    await browser.close();
    return def || "No definition found";
  } catch(e){
    console.error("Wiktionary error:", e);
    return "No definition found";
  }
}

async function fetchHindi(word){
  try {
    const page = await fetch(`https://www.shabdkosh.com/dictionary/english-hindi/${word}`).then(r => r.text());
    const $ = cheerio.load(page);
    const entry = $(".dictionary_results .dict_result").first().text().trim();
    return entry || "No Hindi definition found";
  } catch(e){
    console.error("Hindi error:", e);
    return "No Hindi definition found";
  }
}

async function fetchUrdu(word){
  try {
    const page = await fetch(`https://www.urdupoint.com/dictionary/english-urdu/${word}.html`).then(r => r.text());
    const $ = cheerio.load(page);
    const entry = $(".meaning").first().text().trim();
    return entry || "No Urdu definition found";
  } catch(e){
    console.error("Urdu error:", e);
    return "No Urdu definition found";
  }
}

async function fetchMW(word){
  try {
    const key = process.env.MW_API_KEY;
    if(!key) return "MW API key missing";
    const res = await fetch(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${key}`);
    const data = await res.json();
    if(data[0]?.shortdef) return data[0].shortdef.join("; ");
    if(typeof data[0] === "string") return "Did you mean: " + data[0];
    return "No definition found";
  } catch(e){
    console.error("MW error:", e);
    return "No definition found";
  }
}

async function fetchFreeDict(word){
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    return data[0]?.meanings?.map(m => m.definitions[0].definition) || ["No definition found"];
  } catch(e){
    return ["No definition found"];
  }
}

async function fetchThesaurus(word){
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_syn=${word}`);
    const data = await res.json();
    return data.length ? data.map(d => d.word) : ["No synonyms found"];
  } catch(e){
    return ["No synonyms found"];
  }
}

async function fetchUrban(word){
  try {
    const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${word}`).then(r => r.json());
    return res.list?.slice(0,3).map(d => d.definition) || ["No definition found"];
  } catch(e){
    return ["No definition found"];
  }
}

async function fetchCambridge(word){
  try {
    const page = await fetch(`https://dictionary.cambridge.org/dictionary/english/${word}`, { headers: { "User-Agent": "Mozilla/5.0" }}).then(r=>r.text());
    const $ = cheerio.load(page);
    const def = $(".def.ddef_d.db").first().text().trim();
    return def || "No definition found";
  } catch(e){
    return "No definition found";
  }
}

// --------- API Route ---------
app.get("/api/dictionary", async (req,res)=>{
  const word = req.query.word;
  if(!word) return res.status(400).send("Missing 'word' query param");

  const [wiki,hindi,urdu,mw,freeDict,thesaurus,urban,cambridge] = await Promise.all([
    fetchWiktionary(word),
    fetchHindi(word),
    fetchUrdu(word),
    fetchMW(word),
    fetchFreeDict(word),
    fetchThesaurus(word),
    fetchUrban(word),
    fetchCambridge(word)
  ]);

  const html = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body { font-family:'Roboto',sans-serif; padding:10px; background:#f2f2f2; }
    h1 { text-align:center; color:#2196F3; }
    .card { background:white; padding:15px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.2); margin:10px 0; }
    .card h2 { color:#333; margin-bottom:8px; }
    .synonyms li { display:inline-block; background:#e0f7fa; margin:3px; padding:5px 10px; border-radius:8px; font-size:0.9em; }
  </style>
  </head>
  <body>
    <h1>${word}</h1>
    <div class="card"><h2>Wiktionary</h2><p>${wiki}</p></div>
    <div class="card"><h2>Hindi</h2><p>${hindi}</p></div>
    <div class="card"><h2>Urdu</h2><p>${urdu}</p></div>
    <div class="card"><h2>Merriam-Webster</h2><p>${mw}</p></div>
    <div class="card"><h2>Free Dictionary</h2>${freeDict.map(d=>`<p>${d}</p>`).join('')}</div>
    <div class="card"><h2>Thesaurus (Synonyms)</h2><ul class="synonyms">${thesaurus.map(s=>`<li>${s}</li>`).join('')}</ul></div>
    <div class="card"><h2>Urban Dictionary</h2>${urban.map(d=>`<p>${d}</p>`).join('')}</div>
    <div class="card"><h2>Cambridge</h2><p>${cambridge}</p></div>
  </body>
  </html>
  `;

  res.status(200).send(html);
});

// --------- Start Server ---------
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
