import fetch from 'node-fetch';
import xpath, { SelectedValue } from 'xpath';
import { DOMParser } from 'xmldom';
import { ConsumptionInput, BookMetadata, ACGNMetadata, isBookConsumptionInput, isACGNConsumptionInput, BookConsumptionInput, ACGNConsumptionInput } from '../index.js';
import { inferACGNType } from '../transformers/transformer.js';

// borrowed from https://github.com/doubaniux/boofilsic/blob/master/common/scraper.py

export async function retrieve<T extends ConsumptionInput>(input: T): Promise<BookMetadata | ACGNMetadata | void> {
  let parser: ((content: Document, input: BookConsumptionInput) => BookMetadata | void)
    | ((content: Document, input: ACGNConsumptionInput) => ACGNMetadata | void);
  
    if (isBookConsumptionInput(input)) {
    parser = parseBook;
  } else if (isACGNConsumptionInput(input)) {
    parser = parseACGN;
  } else {
    return new Promise((_, reject) => {
      // @ts-ignore: Property does not exist on type 'never'
      console.error(`Undefined parser for database ${input.database}.`);
      reject(`Undefined parser for database ${input.database}.`);
    });
  }
  
  console.debug(`fetching from ${input.origin}`);
  let status: number;
  return await fetch(input.origin, { headers: headers })
    .then(
      (r) => {
        status = r.status;
        return r.text();
      })
    .then(
      (content) => {
        console.log(status);
        let doc;
        try {
          doc = new DOMParser({
            locator: {},
            errorHandler: {
              // suppress parser warnings/errors
              warning: function (w) { },
              error: function (e) { },
              fatalError: function (e) { console.error(e) }
            }
          }).parseFromString(content);
        } catch (err) {
          console.error(`Parsing error`);
        }
        console.debug(doc);
        // @ts-ignore
        console.debug(parser(doc, input));
        // @ts-ignore
        return parser(doc, input);
      })
    .catch(error => {
      console.error(error);
    });
}

function parseBook(content: Document, input: BookConsumptionInput): BookMetadata {
  console.debug("Parsing book");
  const name = safeSelect("/html/body//h1/span/text()", content);
  if (!name) {
    console.error("Book title not found.");
    throw "Book title not found.";
  }
  return {
    name,
    publishYear: safeSelect("//div[@id='info']//span[text()='出版年:']/following-sibling::text()[1]", content),
    publisher: safeSelect("//div[@id='info']//span[text()='出版社:']/following-sibling::text()[1]", content),
    authors: safeSelect("//div[@id='info']//span[text()=' 作者']/following-sibling::a/text()", content)
      ?? safeSelect("//div[@id='info']//span[text()='作者:']/following-sibling::br[1]/preceding-sibling::a[preceding-sibling::span[text()='作者:']]/text()", content),
    imgUrl: safeSelect("//*[@id='mainpic']/a/img/@src", content),
  }
}

function parseACGN(content: Document, input: ACGNConsumptionInput): ACGNMetadata | void {
  console.debug("Parsing ACGN");
  // could be either a book (manga, light novel), or a movie (anime), or a game
  const ACGNType = inferACGNType(input);
  if (ACGNType === "Anime") {
    const name = safeSelect("//span[@property='v:itemreviewed']/text()", content);
    if (!name) {
      console.error("Anime title not found.");
      throw "Anime title not found.";
    }
    return {
      name,
      imgUrl: safeSelect("//img[@rel='v:image']/@src", content),
    }
  }
  if (["Manga", "Light Novel"].includes(ACGNType)) {
    // TODO
    throw `Not implemented for ACGNType ${ACGNType}`;
  }
  if (ACGNType === "Game") {
    // TODO
    throw `Not implemented for ACGNType ${ACGNType}`;
  }
}

const headers = {
  'Host': '',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:70.0) Gecko/20100101 Firefox/70.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'DNT': '1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
}

function safeSelect(selector: string, doc: Document): string {
  const selected: SelectedValue[] = xpath.select(selector, doc);
  if (selected && selected[0]) {
    if (typeof selected[0] === "string") {
      return selected[0];
    } else {
      let result = (selected[0] as Attr).nodeValue?.trim();
      return result ? result : "";
    }
  }
  return "";
}
