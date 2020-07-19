const puppeteer = require('puppeteer');
var express = require('express');
var router = express.Router();

var counter = require('./acsPages.js');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const handleErrors = require('./middleware/handleErrors');
const { BadRequest } = require('./utils/errors');

const urls = ["https://www.google.com", "https://www.cashfree.com", "https://www.bing.com/"];
const max = 8
const queue = new Array(max)

async function load(url) {
    try {
        browser = await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:4545'});
        page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 40000});
        console.log("fetched url ", url);
        return {"browser" : browser, "page" : page};
    } catch(err) {
        return -1
    }
}

async function initiate() {
    for(var i = 0; i < max; i++){
        var u = i % 3;
        console.log("Adding item to queue %s and url %s", i, urls[u]);
        result = await load(urls[u])
        if(result == -1) {
            console.log("Got timeout in load"); continue;
        }

        queue[i] = {};
        queue[i].browser = result.browser;
        queue[i].page = result.page;
    }
}

async function clear() {
    var i = Math.floor(Math.random() * max);
    try {
        console.log("Clearing browser from queue %s", i);
        page = queue[i];
        await page.page.close();
        await page.browser.close();
        console.log("Closing browser %s" , i);
    } catch(err){
        console.log("failed to close browser");
        console.log(err)
    }
    try {
        var u =  Math.floor(Math.random() * 3)
        r = await load(urls[u]);
        if( r == -1) {
            console.log("Got timeout in load when adding back to queue"); return;
        }
        //queue[i] = {};
        queue[i].browser = r.browser;
        queue[i].page = r.page;
    } catch(err){
        console.log(err);
        return "failed to clear and load";
    }

}
function timeout(ms) {
    console.log("calling timeout for %s milliseconds", ms);
    return new Promise(resolve => setTimeout(resolve, ms));
}

router.get('/simulate', async function(req, res, next) {
    try {
        await  initiate();
        while(true){
            console.log("waiting...");
            var seconds = Math.floor(Math.random() * 20);
            console.log("sleeping for %s seconds", seconds);
            const sleep = require('util').promisify(setTimeout)
            await sleep(seconds * 1000)
            await clear();
        }
    } catch(e){
        console.log("GOT exception in main thread");
        console.log(e)
    }
});

router.post('/initiate', jsonParser, async function (req, res, next) {
    console.log(req.body);
    var txnId = req.body.id;
    var metadata = {
        "bankName" : req.body.bankName,
        "cardType" : req.body.cardType,
        "cardScheme" : req.body.cardScheme
    }
    var reqDetails = {
        "payUrl" :  req.body.payUrl,
        "payParams" : req.body.reqParams,
        "reqType" : req.body.reqType
    }
    var attemptDetails = {
        "otpAttempts" : 0,
        "resendOtpAttempts" : 0
    }
    try {
        let respStatus = await counter.createNewPage(txnId, metadata, reqDetails, attemptDetails);
        res.json(respStatus);
    } catch(e) {
        console.log(e);
        next(e);
    }
});

router.post('/get', jsonParser, async function (req, res, next) {
    var txnId = req.body.id;
    let resp = await counter.getPage(txnId)
    res.json(resp)
});

router.post('/otp', jsonParser, async function (req, res, next) {
    try {
        const txnId = req.body.id;
        const otp = req.body.otp;
        let respStatus = await counter.submitOTP(txnId, otp);
        res.json(respStatus);
    } catch(e) {
        console.log(e);
        next(e);
    }
});

router.post('/resendOtp', jsonParser, async function (req, res, next) {
    try {
        const txnId = req.body.id;
        let respStatus = await counter.resendOTP(txnId);
        res.json(respStatus);
    } catch(e) {
        console.log(e);
        next(e);
    }
});

router.get('/test', async(req, res, next) => {
    counter.addCount();
    counter.test().then( (out) => {
        throw new BadRequest('something is missing');
        //res.send(out)
    }).catch( e => next(e));
});
module.exports = router;
