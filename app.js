const express = require('express')
// for post parsing
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })

const puppeteer = require('puppeteer');
const fetch = require("node-fetch");
const got = require('got');

const IS_PRODUCTION = 'production123123' === 'production';
const app = express()

const port = 8081

global.pages = {}


const getBrowser = () => IS_PRODUCTION ?
  // Connect to browserless so we don't run Chrome on the same hardware in production
  puppeteer.connect({ browserWSEndpoint: 'wss://chrome.browserless.io' }) :

  // Run the browser locally while in development
  puppeteer.launch({
    //headless: false,
    //slowMo: 1000 // slow down by 250ms
  });

app.post('/initiate', jsonParser, async(req, res) => {
    console.log(req.body)
    var payUrl = req.body.payURL
    var orderHash = req.body.orderHash
    try {
     browser = await getBrowser();
     const page = await browser.newPage();
     // how to do a post - https://stackoverflow.com/questions/47060534/how-do-post-request-in-puppeteer
     //await page.setRequestInterception(true);


     console.log("payment URL is -> " + payUrl);
     // The below works for a GET request
     await page.goto(payUrl, {
         timeout: 0,
         waitUntil: 'networkidle2',
     })
     pages[orderHash] = page
     res.json({status: "OK"})
    } catch (error) {
       console.log(error.message);
       console.log(error);
     if (!res.headersSent) {
       res.status(400).send(error.message);
     }
   } finally {
     if (browser) {
        browser.close();
     }
   }
})

app.post('/submitOTP', jsonParser, async(req, res) => {
    console.log(req.body)
    var OTP = req.body.otp
    var orderHash = req.body.orderHash
    try {
    var page = pages[orderHash]
    console.log("got in main");
    console.log(OTP);
    page.$eval('#txtOtpPassword', (el, otp) => el.value = otp, OTP);
    console.log(typeof(page))
    //page.click("button[type=submit]");


    //await Promise.all([
    //  page.waitForNavigation({ waitUntil: 'networkidle0' }),
    //]);

    const screenshot = await page.screenshot();
    res.end(screenshot, 'binary');
    } catch (error) {
        console.log(error.message);
        console.log(error);
      if (!res.headersSent) {
        res.status(400).send(error.message);
      }
    } finally {
      if (browser) {
         browser.close();
      }
    }
})


app.get('/otp', async(req, res) => {
    let count = 0;
    var pollURL = req.query.pollURL
    var client = {
        get: async function () {
            const response = await fetch(pollURL)
            const text = await response.text();

            return new Promise(function (resolve, reject) {
                count ++;
                setTimeout(function () {
                    if (text != "1") resolve({status:'DONE',otherStuff:'Other Stuff', otp: text});
                    else resolve({status: `count: ${count}`});
                }, 10000);
            });
        }
    }

    async function someFunction() {
        while (true) {
            let dataResult = await client.get('/status');
            console.log(dataResult.status);
            if (dataResult.status == "DONE" || count > 10) {
                return dataResult;
            }
        }
    }
    (async () => {
        let r = await someFunction();
        console.log(r);
        res.send(r)
    })();
});

app.get('/pay-headless', async (req, res) => {
  let browser = null;
  console.log("trying image");
  var payURL = req.query.payURL;
  var otpURL = req.query.pollURL;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    // how to do a post - https://stackoverflow.com/questions/47060534/how-do-post-request-in-puppeteer
    //await page.setRequestInterception(true);


    console.log("payment URL is -> " + payURL);
    // The below works for a GET request
    await page.goto(payURL, {
        timeout: 0,
        waitUntil: 'networkidle2',
    })

    let count = 0;
    var pollURL = req.query.pollURL
    var client = {
       get: async function () {
           const response = await fetch(pollURL)
           const text = await response.text();

           return new Promise(function (resolve, reject) {
               count ++;
               setTimeout(function () {
                   if (text != "1") resolve({status:'DONE', otp: text});
                   else resolve({status: `fetch count: ${count}`});
               }, 10000);
           });
       }
    }
     async function fetchOTP() {
         while (true) {
             let dataResult = await client.get('/status');
             console.log("Fetching data...")
             console.log(dataResult.status);
             if (dataResult.status == "DONE" || count > 15) {
                 return dataResult;
             }
         }
     }
    let r = await fetchOTP();
    console.log(r);

    //var pollURL = "http://localhost:8081/otp?pollURL=" + otpURL
    //console.log("trying to poll OTP from " + pollURL)
    //const response = await fetch(pollURL);
    //const json = await response.json();

    const OTP = r.otp;
    console.log("got in main");
    console.log(OTP);
    page.$eval('#txtOtpPassword', (el, otp) => el.value = otp, OTP);
    page.click("button[type=submit]");


    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const screenshot = await page.screenshot();
    res.end(screenshot, 'binary');
    //await browser.waitForTarget(() => false);

  } catch (error) {
      console.log(error.message);
      console.log(error);
    if (!res.headersSent) {
      res.status(400).send(error.message);
    }
  } finally {
    if (browser) {
       browser.close();
    }
  }
});

app.get('/test', (req, res) => {
    var url = req.query.url
    res.send(url)
});

app.get('/', async (req, res) => {
    const response = await fetch('https://0dcaa716e685.eu.ngrok.io/otp')
    const json = await response.json();
    console.log(json);
    res.send('Hello World!')
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
