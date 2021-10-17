import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';
import { logger, ConsumptionInput, BookMetadata, isBookConsumptionInput } from '../index.js';
import { headers, safeSelect, safeSelectMultiple } from './douban.js';

// borrowed from https://github.com/doubaniux/boofilsic/blob/master/common/scraper.py

export async function retrieve<T extends ConsumptionInput>(input: T): Promise<BookMetadata | void> {
  if (!isBookConsumptionInput(input)) {
    logger.error(`Expecting BookConsumptionInput, but got ${input}`);
    throw `Expecting BookConsumptionInput, but got ${input}`;
  }

  logger.debug(`fetching from ${input.origin}`);
  let status: number;
  return await fetch(input.origin, { headers: headers })
    .then(
      (r) => {
        status = r.status;
        return r.text();
      })
    .then(
      (content) => {
        logger.debug(status);
        let doc;
        try {
          doc = new DOMParser({
            locator: {},
            errorHandler: {
              // suppress parser warnings/errors
              warning: function (w) { },
              error: function (e) { },
              fatalError: function (e) { logger.error(e) }
            }
          }).parseFromString(content);
        } catch (err) {
          logger.error(`Parsing error`);
        }
        if (!doc) {
          logger.error(`Parsing error; doc empty`);
        }

        const name = safeSelect("//h1[@id='bookTitle']/text()", doc as Document);
        if (!name) {
          logger.error("Book title not found.");
          throw "Book title not found.";
        }

        let publishYear: string = '';
        let publisher: string = '';
        // see if the book is already published
        let publishInfo = safeSelect("//div[contains(text(), 'Published') and @class='row']/text()", doc as Document);
        const matchPublished = publishInfo.match(regexPublished);
        if (matchPublished) {
          publishYear = matchPublished[2].trim();
          publisher = matchPublished[3].trim();
        }

        // otherwise, see if the book is about to be published
        if (!publishYear || !publisher) {
          publishInfo = safeSelect("//div[contains(text(), 'Expected publication') and @class='row']/text()", doc as Document);
          const matchExpectedPublication = publishInfo.match(regexExpectedPublication);
          if (matchExpectedPublication) {
            publishYear = matchExpectedPublication[2].trim();
            publisher = matchExpectedPublication[3].trim();
          }
        }

        const result = {
          name,
          publishYear,
          publisher,
          authors: safeSelectMultiple("//a[@class='authorName'][not(../span[@class='authorName greyText smallText role'])]/span/text()", doc as Document).join(', '),
          imgUrl: safeSelect("//img[@id='coverImage']/@src", doc as Document),
        }
        logger.debug(result);
        return result;
      })
    .catch(error => {
      logger.error(error);
    });
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const regexPublished = new RegExp(
  // use the 's' flag to get the dot to match '\n'
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/dotAll
  '.*Published.*(' + months.join('|') + ').*(\\d\\d\\d\\d).+by\\s*(.+)\\s*', 's'
);
const regexExpectedPublication = new RegExp(
  '.*Expected publication.*(' + months.join('|') + ').*(\\d\\d\\d\\d).+by\\s*(.+)\\s*', 's'
);