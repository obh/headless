var express = require('express');
var router = express.Router();

var counter = require('./acsPages.js');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()


function validateInitiateReq(req) {
    // mandatory parameters
}

router.post('/initiate', jsonParser, async function (req, res, next) {
    console.log(req.body);
    var txnId = req.body.id;
    var metadata = {
        "bankName" : req.body.bankName,
        "cardType" : req.body.cardType
    }
    var reqDetails = {
        "payUrl" :  req.body.payUrl,
        "payParams" : req.body.reqParams,
        "reqType" : req.body.reqType
    }

    counter.addCount();
    await counter.createNewPage(txnId, metadata, reqDetails);

    res.send(req.body.id  + ' API Called successful. Pages: ' + counter.getCount());
});

router.post('/otp', jsonParser, async function (req, res, next) {
    var txnId = req.body.id;
    var otp = req.body.otp;

    resp = await counter.submitOTP(txnId, otp);
    res.send(resp);
});

router.get('/test', function (req, res, next) {
    counter.addCount();
    counter.test();
    res.send("OK");
    //var title = counter.getPageTitle(req.params.id).then(function(d){
    //    res.send(d);
    //});
});
module.exports = router;
