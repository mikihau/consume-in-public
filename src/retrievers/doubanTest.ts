import fetch from 'node-fetch';
import { expect } from 'chai';
import { retrieve } from './douban.js';

describe('retrieves metadata from douban', () => {

  before(() => {
    return fetch("http://127.0.0.1:8887/").then( response => {
      if (!response.ok) {
        throw Error("Make sure test_data folder is served on http://127.0.0.1:8887; the easiest way to do it is to install https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb/related?hl=en.");
      }
    })
  });

  it('retrieves BookMetadata', () => {
    return retrieve({
      database: "读书",
      origin: "http://127.0.0.1:8887/douban-book.html",
      status: "想读",
      category: "Uncategorized",
    }).then((result) => {
      expect(result).to.deep.equal(
        {
          "name": "星辰的繼承者",
          "publishYear": "2017-8-31",
          "publisher": "獨步文化",
          "authors": "詹姆士·霍根",
          "imgUrl": "https://img9.doubanio.com/view/subject/s/public/s29535861.jpg"
        }
      );
    })
  });
  
  it('retrieves ACGNMetadata -- Anime', () => {
    return retrieve({
      database: "ACGN",
      origin: "http://127.0.0.1:8887/douban-acgn-anime.html",
      type: "Anime",
      score: 3,
    }).then((result) => {
      expect(result).to.deep.equal(
        {
          "name": "行星与共 プラネット・ウィズ",
          "imgUrl": "https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2521559819.webp"
        }
      );
    });
  });

})