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

        const shortData = JSON.parse(safeSelect("//script[@type='application/ld+json']/text()", doc as Document));
        let title = shortData['name'];
        if (!title) {
          logger.error("Book title not found.");
          throw "Book title not found.";
        }
        const authors = shortData['author'].map((entry: { [x: string]: any; }) => entry['name']).join(' ,');

        const longData = JSON.parse(safeSelect("//script[@id='__NEXT_DATA__']/text()", doc as Document));
        let publishYear: string = '';
        let publisher: string = '';
        for (let [key, value] of Object.entries(longData['props']['pageProps']['apolloState'])) {
          logger.debug(key);
          if (key.startsWith('Book:kca://book/')) {
            const innerObj = value as any;
            // use the shorter title if present and truncate to 100 (notion limit)
            title = (innerObj?.['title'] ?? title).substring(0, 100);
            publishYear = new Date(innerObj['details']['publicationTime']).getFullYear().toString();
            publisher = innerObj['details']['publisher'];
            break;
          }
        }

        const result = {
          name: title,
          publishYear,
          publisher,
          authors,
          imgUrl: safeSelect("//meta[@property='og:image']/@content", doc as Document),
        }
        logger.debug(JSON.stringify(result));
        return result;
      })
    .catch(error => {
      logger.error(error);
    });
}
