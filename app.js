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

async function createReplyMessage(input) {
  const params = {
    document: {
      type: "PLAIN_TEXT",
      language: "JA",
      content: input
    },
    encodingType: "UTF8"
  };

  const { data } = await axios.post(
    gcp_analyze_sentiment_url,
    { params }
  );
  const document_sentiment_score = data.documentSentiment.score;

  return {
    type: "text",
    text: `${document_sentiment_score}`
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
