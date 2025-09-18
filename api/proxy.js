import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { source, word } = req.query;
  if (!source || !word) return res.status(400).send("Missing parameters");

  let url;
  if (source === "oxford") url = `https://www.lexico.com/definition/${word}`;
  if (source === "collins") url = `https://www.collinsdictionary.com/dictionary/english/${word}`;
  if (source === "thesaurus") url = `https://www.thesaurus.com/browse/${word}`;

  try {
    const page = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    }).then(r => r.text());

    const $ = cheerio.load(page);

    // Remove scripts, ads, banners
    $("script, iframe, .ad, .banner, [class*=promo]").remove();

    res.status(200).send($.html());
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch page");
  }
}
