//import { createLogger, format, transports } from 'winston';
import { retrieve as retrieveDouban } from './retrievers/douban.js';
import { update as updateNotion } from './responders/notion.js';
import { update as tootOnMastodon } from './responders/mastodon.js';
import { ConsumptionAttributes, transform } from './transformers/transformer.js';
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const input = getInputFromEnvVars();
logger.debug(input);
(async () => processEvent(input))();

export interface ConsumptionInput {
  database: string;
  origin: string;
  metadata?: BookMetadata | ACGNMetadata;
}

export interface BookConsumptionInput extends ConsumptionInput{
  database: "读书";
  status: "想读" | "在读" | "读过" | "放弃";
  review?: string;
  score?: 1 | 2 | 3 | 4 | 5;
  category: string;
  metadata?: BookMetadata
}

export interface ACGNConsumptionInput extends ConsumptionInput{
  database: "ACGN";
  review?: string;
  score: 1 | 2 | 3 | 4 | 5;
  type?: "Anime" | "Light Novel" | "Manga" | "Game";
  metadata?: ACGNMetadata
}

export function isBookConsumptionInput(input: ConsumptionInput): input is BookConsumptionInput {
  return input.database === "读书";
}
export function isACGNConsumptionInput(input: ConsumptionInput): input is ACGNConsumptionInput {
  return input.database === "ACGN";
}

export interface BookMetadata {
  name: string;
  authors: string;
  publishYear: string;
  publisher: string;
  imgUrl: string;
}

export interface ACGNMetadata {
  name: string;
  imgUrl: string;
}

export interface ResponderExecutionResult {
  success: boolean;
  message?: string;
}

function getInputFromEnvVars(): ConsumptionInput {
  const database = process.env.INPUT_DATABASE;
  logger.info(`database: ${database}`);
  if (database === "读书") {
    return {
      database: "读书",
      origin: process.env.INPUT_ORIGIN || "",
      status: process.env.INPUT_STATUS || "",
      review: process.env.INPUT_REVIEW || "",
      score: process.env.INPUT_SCORE || undefined,
      category: process.env.INPUT_CATEGORY || "",
    } as BookConsumptionInput;
  } else if (database === "ACGN") {
    return {
      database: "ACGN",
      origin: process.env.INPUT_ORIGIN || "",
      review: process.env.INPUT_REVIEW || "",
      score: process.env.INPUT_SCORE as unknown as ACGNConsumptionInput["score"],
      type: process.env.INPUT_TYPE || "",
    } as ACGNConsumptionInput;
  } else {
    throw `database not supported: ${database}`;
  }
}

async function processEvent(input: ConsumptionInput) {
  const retriever = getRetriever(input);
  if (!retriever) {
    throw `No metadata retrievers implemented for link: ${input.origin}`;
  }
  let metadata = await retriever(input);
  if (!metadata) {
    throw `Unable to retrieve metadata from link: ${input.origin}`;
  }
  const enrichedInput = { ...input, metadata };
  logger.info(`Enriched input: ${JSON.stringify(enrichedInput, null, 2)}`);

  const attributes = transform(enrichedInput);
  logger.info(`Transformed input: ${JSON.stringify(attributes, null, 2)}`);

  const result: ResponderExecutionResult[] = [];
  for (let responder of getResponders(attributes)) {
    let response = await responder(attributes);
    logger.info(`Response from responder ${responder.name}: ${JSON.stringify(response, null, 2)}`);
    result.push(response);
  }

  result.push({success: false});
  // exit with non-0 exit code if any of the reponders fail
  if (result.filter((entry) => !entry.success).length > 0) {
    process.exit(1);
  }

  return result;
}

function getRetriever(input: ConsumptionInput): undefined | ((input: ConsumptionInput)=> Promise<BookMetadata | ACGNMetadata | void>) {
  const retrievers = {
    "douban": retrieveDouban,
    //"bangumi": retrieveDouban, // TODO
    //"goodreads": retrieveDouban,  // TODO
  }
  
  let keyword: keyof typeof retrievers;
  for (keyword in retrievers) {
    if (input.origin.includes(keyword)) {
      return retrievers[keyword];
    }
  }
  return undefined;
}

function getResponders(attr: ConsumptionAttributes): ((attr: ConsumptionAttributes) => Promise<ResponderExecutionResult>)[] {
  return [updateNotion, tootOnMastodon];
}
