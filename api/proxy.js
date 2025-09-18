import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { source, word } = req.query;
  if (!source || !word) return res.status(400).send("Missing parameters");

  let url;
  if (source === "oxford") url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
  if (source === "collins") url = `https://www.collinsdictionary.com/dictionary/english/${word}`;
  if (source === "thesaurus") url = `https://www.thesaurus.com/browse/${word}`;

  try {
    let page;

    if (source === "oxford") {
      const api = await fetch(url);
      if (!api.ok) throw new Error("Oxford API error");
      const json = await api.json();
      return res.send(`<h1>${word}</h1><p>${json[0]?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found'}</p>`);
    }

    page = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html"
      },
      redirect: "follow"
    }).then(r => r.text());

    const $ = cheerio.load(page);
    $("script, iframe, .ad, .banner, [class*=promo]").remove();

    res.send($.html());
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch page");
  }
}
