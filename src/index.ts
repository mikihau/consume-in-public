import { retrieve as retrieveDouban } from './retrievers/douban.js';
import { update as updateNotion } from './responders/notion.js';
import { update as tootOnMastodon } from './responders/mastodon.js';
import { ConsumptionAttributes, transform } from './transformers/transformer.js';

(async () => processEvent())();

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
  console.info(`database: ${database}`);
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
      type: process.env.INPUT_CATEGORY || "",
    } as ACGNConsumptionInput;
  } else {
    throw `database not supported: ${database}`;
  }
}

async function processEvent() {
  const input = getInputFromEnvVars();
  console.debug(`Got input: ${input}`);

  const retriever = getRetriever(input);
  if (!retriever) {
    throw `No metadata retrievers implemented for link: ${input.origin}`;
  }
  let metadata = await retriever(input);
  if (!metadata) {
    throw `Unable to retrieve metadata from link: ${input.origin}`;
  }
  const enrichedInput = { ...input, metadata };
  console.info(`Enriched input: ${JSON.stringify(enrichedInput, null, 2)}`);

  const attributes = transform(enrichedInput);
  console.info(`Transformed input: ${JSON.stringify(attributes, null, 2)}`);

  const result: ResponderExecutionResult[] = [];
  for (let responder of getResponders(attributes)) {
    let response = await responder(attributes);
    console.info(`Response from responder ${responder.name}: ${JSON.stringify(response, null, 2)}`);
    result.push(response);
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
