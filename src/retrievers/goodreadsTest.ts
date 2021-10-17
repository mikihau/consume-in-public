import fetch from 'node-fetch';
import { expect } from 'chai';
import { retrieve } from './goodreads.js';

describe('retrieves metadata from goodreads', () => {

  before(() => {
    return fetch("http://127.0.0.1:8887/").then( response => {
      if (!response.ok) {
        throw Error("Make sure test_data folder is served on http://127.0.0.1:8887; the easiest way to do it is to install https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb/related?hl=en.");
      }
    })
  });

  it('retrieves a book published in the past', () => {
    return retrieve({
      database: "读书",
      origin: "http://127.0.0.1:8887/goodreads-book-published.html",
      status: "想读",
      category: "Uncategorized",
    }).then((result) => {
      expect(result).to.deep.equal(
        {
          "authors": "Nathan W. Pyle",
          "imgUrl": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1556745170l/44890112._SX318_.jpg",
          "name": "Strange Planet",
          "publishYear": "2019",
          "publisher": "Morrow Gift",
        }
      );
    })
  });
  
  it('retrieves a book to be published in the future', () => {
    return retrieve({
      database: "读书",
      origin: "http://127.0.0.1:8887/goodreads-book-expected-publication.html",
      status: "想读",
      category: "Uncategorized",
    }).then((result) => {
      expect(result).to.deep.equal(
        {
          "authors": "Neal Ford, Mark   Richards, Pramod J. Sadalage, Zhamak Dehghani",
          "imgUrl": "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1629825122l/58153482.jpg",
          "name": "Software Architecture: The Hard Parts: Modern Tradeoff Analysis for Distributed Architectures",
          "publishYear": "2021",
          "publisher": "O'Reilly Media",
        }
      );
    });
  });

})