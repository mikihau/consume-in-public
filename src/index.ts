import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});
(async () => {
  const response = await notion.search({
    query: 'ACGN', // name of the DB
  });
  console.log(response.results[0].id);
})();