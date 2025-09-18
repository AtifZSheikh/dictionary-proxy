import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { source, word } = req.query;

  if (!source || !word) {
    return res.status(400).json({ error: "Missing parameters ?source=oxford&word=test" });
  }

  let url;
  if (source === "oxford") url = `https://www.lexico.com/definition/${word}`;
  if (source === "collins") url = `https://www.collinsdictionary.com/dictionary/english/${word}`;
  if (source === "thesaurus") url = `https://www.thesaurus.com/browse/${word}`;

  try {
    const page = await fetch(url).then(r => r.text());
    const $ = cheerio.load(page);

    let result = { word };

    if (source === "collins") {
      result.definition = $(".def").first().text() || "No definition found";
    } else if (source === "oxford") {
      result.definition = $(".ind").first().text() || "No definition found";
    } else if (source === "thesaurus") {
      result.synonyms = $(".css-1gyuw4i").map((i, el) => $(el).text()).get();
      if (result.synonyms.length === 0) result.synonyms = ["No synonyms found"];
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: "❌ Failed to fetch word" });
  }
}
