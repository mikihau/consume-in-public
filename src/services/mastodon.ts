import { ConsumptionAttributes, isBookAttributes, isACGNAttributes } from '../transformers/transformer.js';
import fetch from 'node-fetch';

// TODO: to config
const instanceAddr = "https://m.cmx.im";

export async function postToot(attr: ConsumptionAttributes) {
  const params = new URLSearchParams();
  params.append('status', formatStatus(attr));
  console.info(params);
  const response = await fetch(`${instanceAddr}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MASTODON_TOKEN}`
    },
    body: params
  }).then(
    res => res.json()
  ).then(
    json => console.log(json)
  ).catch(err => {
      console.error(err);
      throw new Error(err);
  })
}

function formatStatus(attr: ConsumptionAttributes) {
  let formatted = '';
  if (isBookAttributes(attr)) {
    formatted += `${attr.Status}《${attr.Name}》: ${attr.Origin} `;
  } else if (isACGNAttributes(attr)) {
    formatted += `看过${attr.Type}《${attr.Name}》: ${attr.Origin} `
  } else {
    throw new Error(`Undefined type of ConsumptionAttributes: ${attr}`);
  }
  if (attr.Score && attr.Score !== "N/A") {
    formatted += `${attr.Score}`;
  }
  if (attr.Review) {
    formatted += `${attr.Review}`;
  }
  return formatted;
}