const path = require("path");
const express = require("express");
const line = require("@line/bot-sdk");
const axios = require("axios");

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const lineClient = new line.Client(lineConfig);

const gcp_key = process.env.GCP_KEY;
const gcp_analyze_sentiment_url = `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${gcp_key}`;

const replies = [//入力の感情がネガティブであるほど上の返事をする
  "こんなにひどいことがあったんだから後は上がるだけだよ", // 入力が最もネガティブ
  "出来ることなら変わってあげたいんだけど……",
  "元気出して",
  "明日は明日の風が吹くよ",
  "まあそんな日もあるさ", 
  "ふむふむ", // ニュートラル
  "へー良かったねー",
  "何だい自慢かい？",
  "運が良かっただけでしょ",
  "何て脳天気なんだ",
  "こんなに良いことがあったんだから後は落ちるだけだよ", // 入力が最もポジティブ
];

async function createReplyMessage(input) {
  const params = {
    document: {
      type: "PLAIN_TEXT",
      language: "JA",
      content: input
    },
    encodingType: "UTF8"
  };

  // ここを参考にした
  // http://tech.wonderpla.net/entry/2017/11/28/110000
  const data = await axios.post(
    gcp_analyze_sentiment_url,
    params
  );
  const document_sentiment_score = data.data.documentSentiment.score;

  // document_sentiment_score は -1 〜 +1 まで0.1刻み
  // reply_index は 0 〜 10 になる
  const reply_index = parseInt((document_sentiment_score + 1) / 0.2);
  return {
    type: "text",
    text: replies[reply_index]
  };
}

const server = express();

server.use("/images", express.static(path.join(__dirname, "images")));

server.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  // LINEのサーバーに200を返す
  res.sendStatus(200);

  for (const event of req.body.events) {
    if (event.type === "message" && event.message.type === "text") {
      const message = await createReplyMessage(event.message.text);
      lineClient.replyMessage(event.replyToken, message);
    }
  }
});

server.listen(process.env.PORT || 8080);
