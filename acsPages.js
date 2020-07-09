const puppeteer = require('puppeteer');
const qs = require("qs")
const fs = require('fs');
const yaml = require('js-yaml')


 var counter = function () {
     var count = 0;
     var pages = {};
     var pagesMetadata = {};
     var pageParams = {};

     try {
         let fileContents = fs.readFileSync('./config.yaml', 'utf8');
         var bankConfig = yaml.safeLoad(fileContents);
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

     this.test = function() {
        var b = "hdfc";
        bankCfg = bankConfig[b];
        console.log(bankCfg);
        console.log(bankCfg["otpSelector"]);
     }

     this.submitOTP = async function(id, OTP) {
        try {
            if( !(id in pages) || !(id in pagesMetadata)) {
                return -1;
            }
            metadata = pagesMetadata[id]
            page = pages[id].page
            bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme];
            console.log("Using config for bank ", bankCfg);

            page.$eval(bankCfg["otpSelector"], (el, otp) => el.value = otp, OTP);
            page.click(bankCfg["submitSelector"]);

            var respStatus = "Error";
            await page.on('response', response => {
                //console.log('XHR response received');
                var hasFailed = false;
                if(response.status && response.url().endsWith(bankCfg["failurePage"])) {
                    console.log("Found the error");
                    respStatus = "Failed";
                    hasFailed = true;
                }
                if(response.status && response.url().includes(bankCfg["successPage"])) {
                    console.log("OTP submission successfull");
                    respStatus = "Success";
                }
                if( hasFailed ) {
                    // implies failure
                    response.text().then(data => {
                        //console.log(data);
                    });
                }
                //console.log(response);
            });

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
            const screenshot = await page.screenshot();
            //console.log(response);
            return respStatus;

            // check if OTP satisfies
        } catch(e) {
            console.log(e);
        }
     }

     this.createNewPage = async function(id, metadata, reqDetails){
         console.log("creating new page...");
         try {
             pages[id]= {};
             pages[id].browser = await puppeteer.launch({
                 headless: false
             });
             pages[id].page = await pages[id].browser.newPage();
             //pagesMetadata[id] = {}
             pagesMetadata[id] = metadata
             //pageParams[id] = {}
             pageParams[id] = reqDetails

             if (reqDetails.reqType == "get") {
                this.getUrl(id, reqDetails.payUrl)
             } else if(reqDetails.reqType== "post") {
                this.postUrl(id, reqDetails.payUrl, "application/x-www-form-urlencoded", reqDetails.payParams)
             }
             console.log("page creation finished successfully");
         } catch(e){
             console.log(e);
         }
     }

     this.getUrl = async function(id, url) {
        console.log("loading page...%s", url);
        page = pages[id].page
        // page.goto waits till load event
        const response = await page.goto(url, {
            waitUntil: 'networkidle0',
        });
        metadata = pagesMetadata[id];
        bankCfg = bankConfig[metadata.bankName][metadata.cardType][metadata.cardScheme];
        await page.waitForSelector(bankCfg["otpSelector"], { visible: true, timeout: 0 });
        return 1
     }

     this.postUrl = async function(id, url, contentType, params) {
        console.log("loading page with post %s", url);
        if( contentType != "application/x-www-form-urlencoded") {
            // throw error
            return -1
        }
        page = pages[id].page
        page.on('request', interceptedRequest => {
            var data = {
                'method' : 'POST',
                'postData': qs.stringify(params),
                headers: {
                    ...interceptedRequest.headers(),
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            };
            interceptedRequest.continue(data);
        });

        const response = await page.goto(url)
        return 1
     }

     this.closePage = async function(id) {
        page = pages[id].page
        if(page.url.includes("terminal.php")) {
            pages[id].browser.close()
            delete pages[id]
            delete pagesMetadata[id]
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
