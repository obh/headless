const express = require('express')
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");
const got = require('got');

const IS_PRODUCTION = 'production123123' === 'production';
const app = express()

const port = 8080


const getBrowser = () => IS_PRODUCTION ?
  // Connect to browserless so we don't run Chrome on the same hardware in production
  puppeteer.connect({ browserWSEndpoint: 'wss://chrome.browserless.io' }) :

  // Run the browser locally while in development
  puppeteer.launch({
    headless: false,
    slowMo: 1000 // slow down by 250ms
  });

app.get('/otp', async(req, res) => {
    let count = 0;
    var client = {
        get: async function () {
            const response = await fetch('https://6ce17629a540.ngrok.io/otp.php')
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
            if (dataResult.status == "DONE") {
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

app.get('/image', async (req, res) => {
  let browser = null;
  console.log("trying image");
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

        /*
    page.once("request", interceptedRequest => {
        interceptedRequest.continue({
          method: "POST",
          postData: "PaReq=eNpVUstuwjAQvPsrEB+AHyGhoMUSBBCoApW0Unt1jdUEgQHHqYCv7zqQ0vq0s16PZ8aGt9wZM3k1unJGwtKUpfoyrWIzbKfcf5wqF+ntxrG1SFfXLm9LeBll5iTh27iyOFjJO6wjgDaQIIXTubJegtKn8WIluxFnfRy5QwJ74xYTyQVrVoQL6K1NwKq9kWOnrM5bC+uNs8ojtdoBrbcI6ENlvbvIKE6ANoBA5XYy9/5YDij9rM939IECDX0C9CHspQpViX7PxUaurzP2Pp9xvV1t1T67LGfTy5rFyWoyHQINEwQ2yhspGEpOBG9xNoijAUPNdZ+A2gcRMisxjRid3iCBY7hodEM87PxtoI/KOWN1Y6RBBMz5eLAGZzC23xotPISn85Cv9phY3z0nLuXHpcizLo/7ohclvaeI9ZKQeT1SMxYYkhBB9R0gYaCh9xel98fH6t+n+AHUDK7t&MD=QzF0WHF1cjNjamRyMFEyQ056NDE=&TermUrl=https://6ce17629a540.ngrok.io/pg/cybersource/terminal.php",
          headers: {
            ...interceptedRequest.headers(),
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
      });
      */

    //const response = await page.goto('https://netsafe.hdfcbank.com/ACSWeb/com.enstage.entransact.servers.AccessControlServerSSL?ty=V')
    await page.goto('https://6ce17629a540.ngrok.io/pg/cybersource/pay.php', {
        timeout: 0,
        waitUntil: 'networkidle2',
    })
    //console.log('GOT NEW RESPONSE', response.status, response.headers);

    const response = await fetch('https://8c1323bd00e7.eu.ngrok.io/otp');
    const json = await response.json();
    const OTP = json.otp;
    console.log("got in main");
    console.log(OTP);
    page.$eval('#txtOtpPassword', (el, otp) => el.value = otp, OTP);
    page.click("button[type=submit]");

    //const links = await page.evaluate(({otp}) => {
   //     console.log(otp);
   //     page.$eval('#txtOtpPassword', el => el.value = otp);
   //     page.click("button[type=submit]");
   // }, {otp});

    await Promise.all([
      //page.focus('#txtOtpPassword'),
      //page.type('123455'),
      //page.$eval('#txtOtpPassword', el => el.value = otp),
      //page.click("button[type=submit]"),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    //await page.focus('#txtOtpPassword');
    //await page.type('123455');
    //page.click('.input[type="submit"]')

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


app.get('/', async (req, res) => {
    const response = await fetch('https://8c1323bd00e7.eu.ngrok.io/otp')
    const json = await response.json();
    console.log(json);
    /*fetch('https://8c1323bd00e7.eu.ngrok.io/otp')
        .then(res => res.json())
        .then(function(data) {
            returned = data;
            console.log(returned);  //expecting array
            //res.render('./personal/index.jade', {JSON.stringify(returned)});
        }); */
    res.send('Hello World!')
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
