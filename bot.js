const sanitizeHtml = require('sanitize-html');
const udb = require("./databases/usersdb");
const conf = require('./config.json');
const { Bot, InlineKeyboard } = require("grammy");
const bot = new Bot(conf.bot_api_key);
bot.start();

// Функция для кодирования URL в base64
function encodeURL(url) {
    const encodedURL = Buffer.from(url).toString('base64');
    return encodedURL;
  }
  
  // Функция для декодирования base64 в URL
  function decodeURL(encodedURL) {
    const decodedURL = Buffer.from(encodedURL, 'base64').toString('utf-8');
    return decodedURL;
  }

async function ids(uid) {
    if (conf.admins.indexOf(uid) > -1) {
        return {status: 2, id: uid};
    } else {
        return {status: 1, id: uid};
    }
}

async function sendMSG(userId, text) {
try {
    var options = {
        parse_mode: 'HTML'};
        await bot.api.sendMessage(userId, sanitizeHtml(text, {allowedTags: ['i', 'strong', 'code', 'a', 'code', 'em', 'u', 'ins', 's', 'strike', 'del', 'span', 'pre', 'tg-emoji']}), options);
} catch(error) {
    console.error(error);
    if (typeof error.error_code === 'undefined') console.error(JSON.stringify(error));
    if (error.error_code === 403 && error.description === "Forbidden: bot was blocked by the user" || error.error_code === 403 && error.description === "Forbidden: user is deactivated" || error.error_code !== 400 && error.description === "Bad Request: user not found") {
        await udb.removeUser(userId);
    }
}
    }

async function allCommands() {
    try {
        var options = {
            parse_mode: 'HTML'};
    
        bot.on('message', async (ctx) => {
        let user = await udb.getUser(ctx.from.id);
if (!user || user && Object.keys(user).length === 0) {
    await udb.updateUser(ctx.from.id, {})
}
if (ctx.message.text && ctx.message.text === '/start') {
let text = `Welcome to the bot of post notifications from Mirror.xyz.
To subscribe to the content, just send the url to the profile, for example, like this:
https://mirror.xyz/denis-skripnik.eth
/subscriptions - list of sub-subscriptions
Author: @blind_dev, Chat: @blind_dev_chat`;
await ctx.reply(text, options)
} else if (ctx.message.text && ctx.message.text.indexOf('/start ') > -1) {
    let listId = ctx.message.text.split(' ')[1];
    let text = 'The list was not found.'
    if (!isNaN(listId)) {
        let listOwner = await udb.getUser(parseInt(listId))
        if (listOwner && Object.keys(listOwner).length > 0 && Object.keys(listOwner.blogs).length > 0) {
            let blogs = listOwner.blogs;
            text = `List of user subscriptions ${listId}:`;
            for (let url in blogs) {
                text += `
            <a href="${url}">${url}</a>
/import_${listId}`;
            } // end for.
            } // end if users        
    } // end if !isNaN.
    await ctx.reply(text, options)
} else if (ctx.message.text && ctx.message.text.indexOf('/import_') > -1) {
    let listId = ctx.message.text.split('_')[1];
    let text = 'The list was not found.'
    if (!isNaN(listId)) {
        let listOwner = await udb.getUser(parseInt(listId))
        if (listOwner && Object.keys(listOwner).length > 0 && Object.keys(listOwner.blogs).length > 0) {
            let blogs = listOwner.blogs;
            let newBlogs = Object.assign({}, user.blogs, blogs);
            user.blogs = newBlogs;
            await udb.updateUser(user.id, user.blogs);
        text = 'The list of subscriptions has been imported successfully! Go to /subscriptions to remove the excess (if necessary).'
        } // end if users        
    } // end if !isNaN.
    await ctx.reply(text, options)
} else if (ctx.message.text && ctx.message.text === '/subscriptions') {
let text = `You don't have any active subscriptions.`;
    if (user && Object.keys(user).length > 0 && Object.keys(user.blogs).length > 0) {
let blogs = user.blogs;
text = 'List of subscriptions (url - deletion command):';
for (let url in blogs) {
    text += `
<a href="${url}">${url}</a> - /delete_${encodeURL(url)}`;
} // end for.
text += `
Share a link to your subscription list (this makes it easier to subscribe): https://t.me/mirrorPostsBot?start=${user.id}`;
} // end if users
await ctx.reply(text, options);
} else if (ctx.message.text && ctx.message.text.indexOf('/delete_') > -1) {
    const url = decodeURL(ctx.message.text.split('_')[1]);
    const confirmationText = `Are you sure you want to delete the subscription to ${url}?`;
    const confirmationKeyboard = new InlineKeyboard()
      .text('Yes', `del_${encodeURL(url)}`)
      .text('No', 'noDel');
      await ctx.reply(confirmationText, { reply_markup: confirmationKeyboard });
} else if (ctx.message.text && ctx.message.text.indexOf('https://') > -1 && ctx.message.text.indexOf('mirror.xyz') > -1) {
    let text = `The user is not registered in the bot.`;
if (user && Object.keys(user).length > 0) {
        let url = ctx.message.text;
url = url.trim();
const mirrorRegex = /^[^.]+\.(mirror\.xyz)$/;
if (mirrorRegex.test(url) && url.split('/').length >= 4) url = url.replace(/\/[^\/]+\/?$/, '');
if (!mirrorRegex.test(url) && url.split('/').length >= 5) url = url.replace(/\/[^\/]+\/?$/, '');

user.blogs[url] = [];
        await udb.updateUser(user.id, user.blogs);
text = `Blog <a href="${url}">${url}</a> added to the list of subscriptions!`;
}
await ctx.reply(text, options);
} // end if command.
    }); /// end bot.on.
    } catch(er) {
        console.log(er);
    }

    bot.on('callback_query:data', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        const userId = ctx.callbackQuery.from.id;
        const messageId = ctx.callbackQuery.message.message_id;
    
        if (callbackData.startsWith('del_')) {
            const encodedURL = callbackData.split('_')[1];
            const url = decodeURL(encodedURL);
    const user = await udb.getUser(userId);
                if (user && user.blogs && typeof user.blogs[url] !== 'undefined') {
            // Удаление элемента из объекта blogs
            delete user.blogs[url];
            await udb.updateUser(userId, user.blogs);
                  // Отправка уведомления об успешном удалении
            const notificationText = `The subscription to ${url} has been successfully deleted.`;
            await sendMSG(userId, notificationText);
          } else {
            // Отправка уведомления об ошибке удаления
            const errorText = `Error: Subscription to ${url} not found.`;
            await sendMSG(userId, errorText);
          }
        } else if (callbackData === 'noDel') {
            const cancelText = `The removal of the subscription has been canceled.`;
            await sendMSG(userId, cancelText);
        }
      });
}

module.exports.sendMSG = sendMSG;
module.exports.allCommands = allCommands;