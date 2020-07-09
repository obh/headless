var express = require('express');
var router = express.Router();

var counter = require('./acsPages.js');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const handleErrors = require('./middleware/handleErrors');
const { BadRequest } = require('./utils/errors');

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
        next(e);
    }
});

router.post('/otp', jsonParser, async function (req, res, next) {
    try {
        const txnId = req.body.id;
        const otp = req.body.otp;
        let respStatus = await counter.submitOTP(txnId, otp);
        res.json(respStatus);
    } catch(e) {
        next(e);
    }
});

router.post('/resendOtp', jsonParser, async function (req, res, next) {
    try {
        const txnId = req.body.id;
        let respStatus = await counter.resendOTP(txnId);
        res.json(out);
    } catch(e) {
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
