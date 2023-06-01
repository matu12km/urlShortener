const shortid = require('shortid');
require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;


app.use(cors());
// body-parserを使用する
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

mongoose.set('strictQuery', false);
const mongooseUri = process.env.MONGO_URI;

mongoose.connect(mongooseUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
mongoose.connection.once('open', () => {
  console.log('MongoDB connected!');
});

const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String
});
const Url = mongoose.model('Url', urlSchema);
function isValidUrl(url) {
  const pattern = /^(ftp|http|https):\/\/[^ "]+$/;
  return pattern.test(url);
}

// /api/shorturl へ URL を POST すると、original_url および short_url プロパティを持つ JSON レスポンスを返す。
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  const urlCode = Math.floor(Math.random() * 100000).toString();

  if (!isValidUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  } else {
    try {
      //既に生成済みのURLかチェックする
      let findOne = await Url.findOne({
        original_url: originalUrl
      });
      if(findOne){
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        })
      }else{
        //生成済みでない場合は新規作成
        findOne = new Url({
          original_url: originalUrl,
          short_url: urlCode
        });
        await findOne.save();
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url
        });
      }
    }catch (err) {
      console.error(err);
      res.status(500).json('Server error...');
    }
  }
});

// /api/shorturl/<short_url> へ GET リクエストを送ると、短縮 URL に対応する元の URLへリダイレクト
app.get('/api/shorturl/:short_url', async (req, res) => {
  try{
    const urlParams = await Url.findOne({
      short_url: req.params.short_url
    });
    if(urlParams){
      return res.redirect(urlParams.original_url);
    }else{
      return res.status(404).json('No URL found');
    }
  }catch(err){
    console.error(err);
    res.status(500).json('Server error...');
  }
});


app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});