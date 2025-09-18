import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { source, word } = req.query;
  let result = { word };

  try {
    if (source === "oxford") {
      const api = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
        headers: { "Accept": "application/json" }
      });
      if (!api.ok) throw new Error("Oxford API error");
      const json = await api.json();
      result.definition =
        json[0]?.meanings?.[0]?.definitions?.[0]?.definition || "No definition found";
    }

    else if (source === "collins") {
      const url = `https://www.collinsdictionary.com/dictionary/english/${word}`;
      const page = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      const $ = cheerio.load(page);
      result.definition =
        $(".def").first().text().trim() ||
        $(".definition").first().text().trim() ||
        "No definition found";
    }

    else if (source === "thesaurus") {
      const url = `https://www.thesaurus.com/browse/${word}`;
      const page = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      }).then(r => r.text());

      const $ = cheerio.load(page);
      result.synonyms = $("[data-testid='synonym-link']")
        .map((i, el) => $(el).text().trim())
        .get();

      if (result.synonyms.length === 0) result.synonyms = ["No synonyms found"];
    }

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "❌ Failed to fetch word" });
  }
}
