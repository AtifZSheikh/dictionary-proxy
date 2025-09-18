import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const { source, word } = req.query;
  if (!source || !word) return res.status(400).send("Missing parameters");

  try {
    // ----- Oxford (use dictionary API) -----
    if (source === "oxford") {
      const api = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!api.ok) throw new Error("Oxford API error");
      const json = await api.json();

      // Simple HTML page for Oxford
      const definition = json[0]?.meanings?.[0]?.definitions?.[0]?.definition || "No definition found";
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
            </style>
          </head>
          <body>
            <h1>${word}</h1>
            <p><strong>Definition:</strong> ${definition}</p>
          </body>
        </html>
      `;
      return res.status(200).send(html);
    }

    // ----- Collins / Thesaurus -----
    let url;
    if (source === "collins") url = `https://www.collinsdictionary.com/dictionary/english/${word}`;
    if (source === "thesaurus") url = `https://www.thesaurus.com/browse/${word}`;

    const page = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html"
      },
      redirect: "follow"
    }).then(r => r.text());

    const $ = cheerio.load(page);

    // Remove scripts, ads, banners
    $("script, iframe, .ad, .banner, [class*=promo]").remove();

    // Rewrite links to go through the proxy
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      let newHref;

      if (href.startsWith('http')) {
        newHref = `/api/proxy?source=${source}&word=${encodeURIComponent(href)}`;
      } else {
        let base;
        if (source === 'collins') base = 'https://www.collinsdictionary.com';
        if (source === 'thesaurus') base = 'https://www.thesaurus.com';
        newHref = `/api/proxy?source=${source}&word=${encodeURIComponent(href.replace(/^\/+/, ''))}`;
      }

      $(el).attr('href', newHref);
      $(el).attr('target', '_self'); // open in same iframe
    });

    // Rewrite forms to stay in proxy
    $('form').each((i, el) => {
      $(el).attr('action', `/api/proxy?source=${source}`);
      $(el).attr('target', '_self');
    });

    res.status(200).send($.html());
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch page");
  }
}
