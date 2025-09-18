import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();
app.use(cors());

// Proxy route to fetch original dictionary pages
app.get("/proxy", async (req, res) => {
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

    // Remove common ad elements and scripts
    $("script, iframe, .ad, .banner, [class*=promo]").remove();

    res.send($.html());
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch page");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port " + port));
