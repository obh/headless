const express = require('express')
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");
const got = require('got');

const IS_PRODUCTION = 'production123123' === 'production';
const app = express()

const port = 8081


const getBrowser = () => IS_PRODUCTION ?
  // Connect to browserless so we don't run Chrome on the same hardware in production
  puppeteer.connect({ browserWSEndpoint: 'wss://chrome.browserless.io' }) :

  // Run the browser locally while in development
  puppeteer.launch({
    //headless: false,
    //slowMo: 1000 // slow down by 250ms
  });

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

    /*page.on('request', interceptedRequest => {

        // Here, is where you change the request method and
        // add your post data
        var data = {
            'method': 'POST',
            'postData': 'PaReq=eNpVUttygjAQfc9XOH6AIaHgZdbMaHUGWnUcRWp9i5ARWgkaoKP9+iYotd2nPZvNyZ6zgSBRQkzWIqqUYDAXRcEPopXGw/bRec3ctxWnTjgTPdtT3oa0GSxHK3Fm8CVUkeaSkY7VoYAbiDSFihIuSwY8Oo/9BXuyidXXLXeIIBPKnzBCrSZsHYBvZQSSZ4KNFZdR0vJlKZTkpabmR8D1EYIor2Sprsx2XMANQFCpI0vK8lQMMN7X9ztRjgGbOgL8GGxZmazQei9pzPaTcLYPdttNNr0uwt18Fxy+196LHwbTIWDTgSDmpWDU0iO7lLSs/sCxBkRrqusIeGaGYKtCu+FopTeI4GQeGt0QMSd/C1pHpZSQUSOkQQjE5ZRLoXv0E7+5lvAY/Nkz/kaldqwbL7rXd+dz63zMe8Tp065tW4S63Z7xvG6pGVNtEqWWXVOmtWPY0OD7RvF9+Tr79yl+AFkOrw4=&MD=bDVLbTZXUmEyNVZMZTgzSHJIVTE=&TermUrl=https://6ce17629a540.ngrok.io/pg/cybersource/terminal.php'
        };

        // Request modified... finish sending!
        interceptedRequest.continue(data);
    });
*/

    // Setting request interception to true
    /*
    await page.setRequestInterception(true);
    page.once("request", async interceptedRequest => {
        console.log('INTERCEPTED Request: ' + interceptedRequest.url());
        console.log(await interceptedRequest.method());
        try {
            await interceptedRequest.continue({
                method: "POST",
                postData: "PaReq=eNpVUttuwjAMfc9XoH0AuZQyQCYS141pdFPZkOCtCmYE0RTSFra/X1LoLlEefGzrxOc48LaziOMFqtKihDnmefKBDb3p303LcqpX4UvRbq+EedaL8RO/k/A6iPEk4Yw215mRvMmaAmgNiaOwapeYQkKiTsNZJFsBZ13XcoMEUrSzseSC1Sfkvn5NEzBJinJ6yKw2SUObrU0KVLtGjvasFQKt6gRUVprCfskgbAOtAYHSHuSuKI49Si+XS3N75cEzmiJvqiwF6jsI0N85X0sf5U7+p97I2Cx5nB7W0XuXRfv1ep6G82QZTRb7SR+o7yCwcSNJwZyCe8YbrNNrdXqCAa3yBJLUjyPj3JkTOuFXSODoHxpcEfeVvwmnqLQWjaol1YgAfh4z4wRI59JP7CT8Dj569HarwhkoLsNwO2J5LPRDi4fdwN2AMd5p+xVULRWjdnYJwYKKUlfeUU9Dbwumt7/gon9/5BsuDLU9&MD=RnV1RmlZNU90NjZZMm5MaVNESjE=&TermUrl=https://6ce17629a540.ngrok.io/pg/cybersource/terminal.php",
                headers: {
                  ...interceptedRequest.headers(),
                  "Content-Type": "application/x-www-form-urlencoded"
                  }
                });
        } catch(err) {
            console.log(err);
        }
    });
    await page.goto('https://netsafe.hdfcbank.com/ACSWeb/com.enstage.entransact.servers.AccessControlServerSSL?ty=V', {
        timeout: 0,
        waitUntil: 'networkidle2',
    })
    page.on('response', async response => {
        console.log('INTERCEPTED Response: ' + response.url());
        console.log(await response.status());

    });
    */

    console.log("payment URL is -> " + payURL);
    // The below works for a GET request
    await page.goto(payURL, {
        timeout: 0,
        waitUntil: 'networkidle2',
    })

    var pollURL = "http://localhost:8081/otp?pollURL=" + otpURL
    console.log("trying to poll OTP from " + pollURL)
    const response = await fetch(pollURL);
    const json = await response.json();
    const OTP = json.otp;
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
