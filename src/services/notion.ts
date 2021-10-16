import { Client } from '@notionhq/client';
import { CreatePageParameters, GetPageResponse } from '@notionhq/client/build/src/api-endpoints';
import { ConsumptionAttributes, isBookAttributes, isACGNAttributes } from '../transformers/transformer.js';
import { logger } from '../index.js';

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

// TODO: load from config file
const dbCache = {
  '读书': '57ee04a6-e6f9-4f85-9bf7-03e75f4cfa47',
  'ACGN': '62e43adc-b1d9-4591-9181-d8681c227582',
}

export async function getDatabaseId(databaseName: string): Promise<string> {
  const key = databaseName as keyof typeof dbCache;
  if (dbCache[key]) {
    return dbCache[key];
  }

  const response = await notion.search({
    query: databaseName,
    filter: {
      property: 'object',
      value: 'database'
    }
  });
  if (response.results.length !== 1) {
    throw `Database name not found: ${databaseName}`;
  }
  return response.results[0].id;
}

export async function upsertDatabaseRecord(databaseId: string, attr: ConsumptionAttributes) {
  const record = await getDatabaseRecord(databaseId, attr.Origin);
  if (!record) {
    logger.debug(`${attr.Origin} not found, creating ...`);
    await createDatabaseRecord(databaseId, attr);
  } else {
    logger.debug(`${attr.Origin} exists, updating ...`);
    await updateDatabaseRecord(record.id, attr);
  }
}

async function getDatabaseRecord(databaseId: string, key: string): Promise<GetPageResponse | undefined> {
  // returns 0 or 1 record; otherwise throws
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: 'Origin',
      text: { contains: key.replace(/^(https:\/\/)/, "").replace(/\/$/, '') }
    },
  });
  if (response.results.length > 1) {
    throw `Multiple results exist for key ${key} at database id ${databaseId}`;
  }
  logger.debug(response.results[0]);
  return response.results.length === 1 ? response.results[0] : undefined;
}

async function createDatabaseRecord(databaseId: string, attr: ConsumptionAttributes) {
  //@ts-ignore
  const response = await notion.pages.create({
    parent: {
      database_id: databaseId
    },
    properties: generatePropertyParams(attr),
    cover: {
      type: "external",
      external: {
        url: attr.ImgUrl
      }
    },
  })
  logger.debug(response);
}

async function updateDatabaseRecord(recordId: string, attr: ConsumptionAttributes) {
  const properties = generatePropertyParams(attr);
  delete properties["Created At" as keyof CreatePageParameters['properties']];

  const response = await notion.pages.update({
    page_id: recordId,
    archived: false,
    cover: {
      type: "external",
      external: {
        url: attr.ImgUrl
      }
    },
    // @ts-ignore
    properties,
  });
  logger.debug(response);
}

function generatePropertyParams(attr: ConsumptionAttributes): CreatePageParameters['properties'] {
  let properties: CreatePageParameters['properties'] = {
    "title": {
      "title": [
        {
          "type": "text",
          "text": {
            "content": attr.Name
          }
        }
      ]
    },
    "Created At": {
      date: {
        start: attr['Created At'].toISOString()
      }
    },
    "Origin": {
      url: attr.Origin
    },
    "Review": {
      rich_text: [{
        text: {
          content: attr.Review
        }
      }]
    },
    "Score": {
      select: {
        name: attr.Score
      }
    }
  };
  if (isBookAttributes(attr)) {
    properties = {
      ...properties,
      "Author/Publish Year/Publisher": {
        rich_text: [{
          text: {
            content: attr['Author/Publish Year/Publisher']
          }
        }]
      },
      "Category": {
        select: {
          name: attr.Category
        }
      },
      "Last Updated At": properties["Created At"],
      "Status": {
        select: {
          name: attr.Status
        }
      },
    }
  } else if (isACGNAttributes(attr)) {
    properties = {
      ...properties,
      "Type": {
        select: {
          name: attr.Type
        }
      }
    }
  }
  return properties;
}