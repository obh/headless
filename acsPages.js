const puppeteer = require('puppeteer');
const qs = require("qs")
const fs = require('fs');
const yaml = require('js-yaml')
var Const = require('./svcConstants');

 var counter = function () {
     const count = 0;
     const pages = {};
     const pagesMetadata = {};
     const pageParams = {};
     const attemptDetails = {};
     var bankConfig;

     try {
         let fileContents = fs.readFileSync('./config.yaml', 'utf8');
         bankConfig = yaml.safeLoad(fileContents);
         console.log(Const);
         console.log(bankConfig);
         console.log(bankConfig["hdfc"]["credit"]["visa"]);
     } catch (e) {
         console.log(e);
     }

     this.addCount = function () {
         count++
     }

     this.getCount = function () {
         return count;
     }

     this.test = async function() {
        var b = "hdfc";
        bankCfg = bankConfig[b];
        console.log(bankCfg);
        console.log(bankCfg["otpSelector"]);
        return 1;
        //throw new Error("broken");
     }

     this.getPage = async function(id) {
        var output = {"Status": Const.RESPONSE_STATUS_ERROR, "Message": Const.RESPONSE_MSG_INVALID_ID};
        if( !this.txnExists(id) ) {
            return output;
        }
        page = pages[id].page
        console.log("FOUND PAGE: " + page.url())
        return {"Status": Const.RESPONSE_STATUS_OK, "Message" : Const.RESPONSE_MSG_OTP_OK};
     }

     this.submitOTP = async function(id, OTP) {
        var output = {"Status": Const.RESPONSE_STATUS_ERROR, "Message": Const.RESPONSE_MSG_INVALID_ID};
        if( !this.txnExists(id) ) {
            return output;
        }
        try {
            metadata = pagesMetadata[id]
            page = pages[id].page
            bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme];
            console.log("Using config for bank ", bankCfg);
            maxAttempts = bankCfg.otpAttempts
            currAttempts = attemptDetails[id].otpAttempts
            if( currAttempts >= maxAttempts ){
                return output;
            }
            attemptDetails[id].otpAttempts += 1

            page.$eval(bankCfg.otpSelector, (el, otp) => el.value = otp, OTP);
            page.click(bankCfg.submitSelector);

            var respStatus = "Error";
            await page.on('response', response => {
                if(response.status && response.url().includes(bankCfg.failurePage)) {
                    output.Status = Const.RESPONSE_STATUS_OK;
                    output.Message = Const.RESPONSE_MSG_OTP_FAIL;
                    console.log("Found the error");
                }
                if(response.status && response.url().includes(bankCfg.successPage)) {
                    output.Status = Const.RESPONSE_STATUS_OK;
                    output.Message = Const.RESPONSE_MSG_OTP_OK;
                    console.log("OTP submission successfull");
                }
            });

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            return output;

        } catch(e) {
            console.log(e);
        }
     }

    // TODO - timer should increase if a resend is done
    this.resendOTP = async function(id) {
        var output = {"Status": Const.RESPONSE_STATUS_ERROR, "Message": Const.RESPONSE_MSG_INVALID_ID};
        if( !this.txnExists(id) ) {
            return output;
        }
        try {
            metadata = pagesMetadata[id]
            bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme];
            resendOtpAttempts = bankCfg.resendOtpAttempts
            currAttempts = attemptDetails[id].resendOtpAttempts
            if( currAttempts >= resendOtpAttempts) {
                return -1;
            }
            attemptDetails[id].resendOtpAttempts += 1
            page = pages[id].page
            page.click(bankCfg.resendOtpSelector);
            resp = await page.waitForNavigation();
        } catch(e) {
            console.log(e);
        }
        return output
    }

     this.createNewPage = async function(id, metadata, reqDetails){
         var output = {"Status": Const.RESPONSE_STATUS_ERROR, "Message": Const.RESPONSE_MSG_ID_EXISTS};
         if( this.txnExists(id) ) {
             return output;
         }
         console.log("creating new page...");
         try {
             pages[id]= {};
             //pages[id].browser = await puppeteer.launch({
             //    headless: false
             //});
             // Using docker image from browserless
             pages[id].browser = await puppeteer.connect({ browserWSEndpoint: 'ws://localhost:4545' });
             pages[id].page = await pages[id].browser.newPage();
             pagesMetadata[id] = metadata
             pageParams[id] = reqDetails
             attemptDetails[id] = reqDetails

             if (reqDetails.reqType == "get") {
                 //await this.getUrl(id, reqDetails.payUrl)
                await this.getUrl(id, "https://www.cashfree.com")
             } else if(reqDetails.reqType == "post") {
                await this.postUrl(id, reqDetails.payUrl, "application/x-www-form-urlencoded", reqDetails.payParams)
             }
             output.Status = Const.RESPONSE_STATUS_OK;
             output.Message = Const.RESPONSE_INITIATE_OK;
        //     bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme]
             // close the browser after some time
             var that = this;
          //   setTimeout(function () {
          //       that.closePage(id);
          //   }, bankCfg.timeout * 1000);
             console.log("page creation finished successfully");
         } catch(e){
             output.Message = this.errorHandling(e);
             console.log(e);
         }
         return output;
     }

     this.getUrl = async function(id, url) {
         console.log("loading page...%s", url);
         page = pages[id].page
         // page.goto waits till load event
         const response = await page.goto(url, {
             waitUntil: 'networkidle0',
             timeout: 40000,
         });
         console.log(response);
         metadata = pagesMetadata[id];
         bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme];
         //TODO We should track all the redirection times
         //await page.waitForSelector(bankCfg.otpSelector, { visible: true, timeout: 30000 });
         console.log(page.title());
     }

     this.postUrl = async function(id, url, contentType, params) {
         console.log("loading page with post %s", url);
         if( contentType != "application/x-www-form-urlencoded") {
             // throw error
             return -1
         }
         page = pages[id].page
         await page.setRequestInterception(true);
         page.on('request', interceptedRequest => {
             var data = {
                 'method' : 'POST',
                 'postData': qs.stringify(params),
                 headers: {
                     ...interceptedRequest.headers(),
                     "Content-Type": contentType,
                 }
             };
             interceptedRequest.continue(data);
         });
         // this is navigation timeout for the loading page. But since we could have redirects involved
         const response = await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 10000,
         });
         console.log(response);
         metadata = pagesMetadata[id];
         bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme];
         // TODO Timeout should come from config
         await page.waitForSelector(bankCfg.otpSelector, { visible: true, timeout: 30000 });
         return 0;
     }

     this.closePage = function(id) {
         if( !this.txnExists(id) ) {
             console.log("Cannot close page, page does not exists ", id);
         }
         console.log("Closing browser page...", id);
         page = pages[id].page
         pages[id].browser.close()
         delete pages[id]
         delete pagesMetadata[id]
         delete pageParams[id]
         console.log("Closed browser page successfully", id);
     }

     this.txnExists = (id) => {
        //console.log(id);
        //console.log(pages);
        //console.log(pagesMetadata);
        console.log((id in pages));
        console.log((id in pagesMetadata));
        console.log((id in pageParams));
        console.log((id in attemptDetails));
        return ((id in pages) && (id in pagesMetadata) && (id in pageParams) && (id in attemptDetails))
     }

     this.errorHandling = (e) => {
        if(e instanceof puppeteer.errors.TimeoutError) {
            return Const.RESPONSE_MSG_TIMEOUT;
        }
     }
 }

counter.instance = null;

counter.getInstance = function () {
    if (this.instance === null) {
        this.instance = new counter();
    }

    return this.instance;
}

module.exports = counter.getInstance();
