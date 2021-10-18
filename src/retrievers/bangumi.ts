import fetch from 'node-fetch';
import { logger, ConsumptionInput, BookMetadata, ACGNMetadata, isBookConsumptionInput, isACGNConsumptionInput, BookConsumptionInput, ACGNConsumptionInput } from '../index.js';
import { inferACGNType } from '../transformers/transformer.js';

export async function retrieve<T extends ConsumptionInput>(input: T): Promise<ACGNMetadata | void> {
  if (!isACGNConsumptionInput(input)) {
    logger.error(`Expecting ACGNConsumptionInput, but got ${input}`);
    throw `Expecting ACGNConsumptionInput, but got ${input}`;
  }

  const APIUrl = input.origin.replace('bangumi.tv', 'api.bgm.tv');
  logger.debug(`fetching from ${APIUrl}`);
  let status: number;
  return await fetch(APIUrl)
    .then(
      (r) => {
        status = r.status;
        return r.json();
      })
    .then(
      (data) => {
        logger.debug(status);
        logger.debug(JSON.stringify(data, undefined, 2));
        return {
          // @ts-ignore
          name: data['name_cn']? data['name_cn'] + ' ' + data['name'] : data['name'],
          // @ts-ignore
          imgUrl: data.images.common || data.images.medium,
          // SubjectType from Bangumi API -- https://github.com/bangumi/api/blob/master/open-api/api.yml#L905-L911
          // @ts-ignore
          type: {
            1: 'Manga', // could also be Light Novel, but defaulting to Manga
            2: 'Anime',
            4: 'Game'
          // @ts-ignore
          }[data.type]
        }
      })
    .catch(error => {
      logger.error(error);
    });
}