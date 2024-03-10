const {
  Client,
  GatewayIntentBits,
  Events,
  AttachmentBuilder,
} = require("discord.js");
const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 3e3;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

app.get("/", (req, res) => {
  res.send("server is running");
});

app.get("/robux", (req, res) => {
  const {
    userAvatar: secondAuthorURL,
    authorURL,
    authorName,
    secondAuthor: secondAuthorName,
    secondAuthorRes,
    robuxSecondRes,
  } = req.query;

  const secondAuthorDate = formatAMPM(new Date());
  const firstAuthorDate = formatAMPM(new Date(Date.now() - 60000));

  const htmlOutput = fs
    .readFileSync(`${__dirname}/robux.html`, "utf8")
    .replaceAll("FIRST_AUTHOR_URL", authorURL)
    .replaceAll("FIRST_AUTHOR_NAME", authorName)
    .replaceAll("SECOND_AUTHOR_URL", secondAuthorURL)
    .replaceAll("SECOND_AUTHOR_NAME", secondAuthorName)
    .replaceAll("SECOND_AUTHOR__FIRST_RES", secondAuthorRes)
    .replaceAll("SECOND_AUTHOR__SECOND_RES", robuxSecondRes)
    .replaceAll("FIRST_AUTHOR_DATE", "Today at " + firstAuthorDate)
    .replaceAll("SECOND_AUTHOR_DATE", "Today at " + secondAuthorDate);
  res.send(htmlOutput);
});

function getRandomAvatar(e) {
  const authorURL = e.author.displayAvatarURL();
  let randomUserAvatar = client.users.cache.random().displayAvatarURL();

  while (authorURL === randomUserAvatar) {
    randomUserAvatar = client.users.cache.random().displayAvatarURL();
  }

  return randomUserAvatar;
}

async function robuxGenerator(msg, content) {
  const authorURL = msg.author.displayAvatarURL();
  const secondUserAvatar = getRandomAvatar(msg);

  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  try {
    const page = await browser.newPage();

    const secondAuthor = content.shift();
    const secondAuthorRes = content[0]?.replaceAll("\n", "<br>");

    const robuxSecondRes = content[1]?.replaceAll("\n", "<br>");
    console.log(
      `https://discord-robux.onrender.com/robux?userAvatar=${secondUserAvatar}&authorURL=${authorURL}&authorName=${msg.author.username}&secondAuthor=${secondAuthor}&secondAuthorRes=${secondAuthorRes}&robuxSecondRes=${robuxSecondRes}`
    );
    await page.goto(
      `https://discord-robux.onrender.com/robux?userAvatar=${secondUserAvatar}&authorURL=${authorURL}&authorName=${msg.author.username}&secondAuthor=${secondAuthor}&secondAuthorRes=${secondAuthorRes}&robuxSecondRes=${robuxSecondRes}`
    );
    // await page.goto(
    //   `http://localhost:3000/robux?userAvatar=${secondUserAvatar}&authorURL=${authorURL}&authorName=${msg.author.username}&secondAuthor=${secondAuthor}&secondAuthorRes=${secondAuthorRes}&robuxSecondRes=${robuxSecondRes}`
    // );

    await page.waitForSelector(".scrollerInner-2YIMLh");

    const scrollerInner = await page.$(".scrollerInner-2YIMLh");

    const screenshot = await scrollerInner.screenshot({ type: "png" });
    await browser.close();

    const file = new AttachmentBuilder(screenshot, {
      name: `robuxProof-${Math.floor(Math.random() * 1000)}.png`,
    });

    await msg.channel.send({ content: `${msg.author}`, files: [file] });
  } catch (error) {
    console.log(error);
    await browser.close();
  }
}

function formatAMPM(msg) {
  var t = msg.getHours(),
    a = msg.getMinutes(),
    n = t >= 12 ? "PM" : "AM";
  return (t = (t %= 12) || 12) + ":" + (a = a < 10 ? "0" + a : a) + " " + n;
}

client.once(Events.ClientReady, (c) => {
  console.log(`readyy!! ${c.user.tag} is online`);
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.channel.type === "dm" || msg.author.bot) return;

  const content = msg.content
    .slice(1)
    .trim()
    .split("-")
    .map((c) => c.trim());

  const command = content.shift().toLowerCase();
  if (command === "robux") {
    await robuxGenerator(msg, content);
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

client.login(process.env.TOKEN);

module.exports = app;
