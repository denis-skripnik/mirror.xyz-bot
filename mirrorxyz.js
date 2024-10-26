require("./databases/@db.js").initialize({
  url: 'mongodb://localhost:27017',
  poolSize: 15
});

const udb = require("./databases/usersdb");
const botjs = require("./bot");
const Parser = require('rss-parser');
const parser = new Parser();

async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
  }


async function getNews() {
  const users = await udb.findAllUsers();
let cacheFeeds = {};
  for (const user of users) {
        let newPosts = 0;
    for (const url in user.blogs) {
      if (user.blogs.hasOwnProperty(url)) {
        let feedUrl = url;
        if (!url.endsWith('/')) feedUrl += '/';
        feedUrl += 'feed/atom';
  try {
    let feed = {};
    if (typeof cacheFeeds[url] !== 'undefined') {
      feed = cacheFeeds[url];
    } else {
      await sleep(3000);
      feed = await parser.parseURL(feedUrl);
      cacheFeeds[url] = feed;
    }
    if (Object.keys(feed).length === 0) continue;
    const lastPosts = user.blogs[url] || [];
    if (typeof feed.items === 'undefined' || !feed.items) continue;
    const MAX_MESSAGES = 10;
    let sentMessages = 0;
    const newLinks = [];
    for (const item of feed.items) {
      if (lastPosts.includes(item.link) || newLinks.includes(item.link)) continue;
      if (sentMessages >= MAX_MESSAGES) break;
      newLinks.push(item.link);
      newPosts++;
      const message = `<a href="${item.link}?referrerAddress=0xaeac266a4533CB0B4255eA2922f997353a18B2E8">${item.title}</a>\n${item.content}
      From ${url}`;
      await botjs.sendMSG(user.id, message);
      sentMessages++;
    }
    user.blogs[url] = [...new Set([...lastPosts, ...newLinks])];
  } catch(e) {
    console.error(e)
    continue;
  } // try catch.
} // user.blogs.hasOwnProperty(url)
} // for url in user.blogs.
try {
  if (newPosts > 0) {
    await udb.updateUser(user.id, user.blogs);
  }
} catch(error) {
  console.error(error);
}

 }
}

setTimeout(getNews, 5000);
setInterval(getNews, 300000);

botjs.allCommands();