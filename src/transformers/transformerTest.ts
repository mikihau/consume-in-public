import { expect } from 'chai';
import { ACGNAttributes, BookAttributes, transform } from './transformer.js';

describe('transforms consumption inputs', () => {

  it('transforms book', () => {
    const result = transform({
      database: "读书",
      origin: "https://book.douban.com/subject/27119879/",
      status: "放弃",
      score: 1,
      review: "弃了。。。",
      category: "Uncategorized",
      metadata: {
        "name": "星辰的繼承者",
        "publishYear": "2017-8-31",
        "publisher": "獨步文化",
        "authors": "詹姆士·霍根",
        "imgUrl": "https://img9.doubanio.com/view/subject/s/public/s29535861.jpg"
      }
    }) as BookAttributes;
    let { "Created At": createdAt, "Last Updated At": lastUpdatedAt, ...otherParams } = result;
    expect(createdAt).to.be.equal(lastUpdatedAt);
    expect(otherParams).to.deep.equal({
      "Author/Publish Year/Publisher": "詹姆士·霍根/2017-8-31/獨步文化",
      "Category": "Uncategorized",
      "Database": "读书",
      "ImgUrl": "https://img9.doubanio.com/view/subject/s/public/s29535861.jpg",
      "Name": "星辰的繼承者",
      "Origin": "https://book.douban.com/subject/27119879/",
      "Review": "弃了。。。",
      "Score": "⭐️",
      "Status": "放弃"
    });
  });

  it('transforms ACGN', () => {
    const result = transform({
      database: "ACGN",
      origin: "https://movie.douban.com/subject/30179558/",
      type: "Anime",
      score: 3,
      metadata: {
        "name": "行星与共 プラネット・ウィズ",
        "imgUrl": "https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2521559819.jpg"
      }
    }) as ACGNAttributes;
    let { "Created At": createdAt, ...otherParams } = result;
    expect(otherParams).to.deep.equal({
      "Database": "ACGN",
      "ImgUrl": "https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2521559819.jpg",
      "Name": "行星与共 プラネット・ウィズ",
      "Origin": "https://movie.douban.com/subject/30179558/",
      "Review": "",
      "Score": "⭐️⭐️⭐️",
      "Type": "Anime",
    });
  })

})