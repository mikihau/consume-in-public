import { ConsumptionAttributes, isBookAttributes, isACGNAttributes } from '../transformers/transformer.js';
import { logger } from '../index.js';
import fetch from 'node-fetch';

// TODO: to config
const instanceAddr = "https://fedi.fourhappylions.com";

export async function postToot(attr: ConsumptionAttributes) {
  const params = new URLSearchParams();
  params.append('status', formatStatus(attr));
  params.append('content_type', 'text/markdown'); 
  logger.info(params);
  const response = await fetch(`${instanceAddr}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AKKOMA_TOKEN}`
    },
    body: params
  }).then(r => 
    r.json().then(data => ({status: r.status, body: data}))
  ).then(res => {
    if (res.status !== 200) {
      const msg = `Request failed: ${JSON.stringify(res)}`
      logger.error(msg)
      throw new Error(msg)
    } else {
      logger.debug(JSON.stringify(res))
    }
  })
}

function formatStatus(attr: ConsumptionAttributes) {
  let formatted = '';
  if (attr.Score && attr.Score !== "N/A") {
    formatted += `${attr.Score}`;
  }
  if (isBookAttributes(attr)) {
    formatted += `${attr.Status}《[${attr.Name}](${attr.Origin})》`;
  } else if (isACGNAttributes(attr)) {
    formatted += `看过${attr.Type}《[${attr.Name}](${attr.Origin})》`
  } else {
    throw new Error(`Undefined type of ConsumptionAttributes: ${attr}`);
  }
  if (attr.Review) {
    formatted += `: ${attr.Review}`;
  }
  return formatted;
}
