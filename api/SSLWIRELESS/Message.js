const axios = require("axios");
require("dotenv").config();

class TextMessage {
  constructor(msgInfo) {
    this.msgInfo = msgInfo;
  }
  /**
   * This Mathod will help to send single message
   * @returns
   */
  singleMessage() {
    let msgInfo = this.msgInfo;
    return new Promise((resolve, reject) =>
      (async function () {
        try {
          let response = await axios.post(
            process.env.SSLWAIRELESS_SMS_BASEURL + "/api/v3/send-sms",
            {
              api_token: process.env.SSLWAIRELESS_TOKEN,
              sid: msgInfo.sid ? msgInfo.sid : process.env.SSLWAIRELESS_SID1,
              msisdn: msgInfo.msisdn,
              sms: msgInfo.sms,
              csms_id: msgInfo.csms_id,
            }
          );
          resolve(response?.data?.smsinfo);
        } catch (err) {
          reject(err);
        }
      })()
    );
  }

  /**
   * This mathod will help to send sms bulkly...
   * @returns
   */
  bulkMessage() {
    let msgInfo = this.msgInfo;
    return new Promise((resolve, reject) =>
      (async function () {
        try {
          const { msisdn } = msgInfo;
          let multiResponse = [];
          const chunkSize = 100;
          for (let i = 0; i < msisdn.length; i += chunkSize) {
            const chunk = msisdn.slice(i, i + chunkSize);
            // Req with chunks
            let response = await axios.post(
              process.env.SSLWAIRELESS_SMS_BASEURL + "/api/v3/send-sms/bulk",
              {
                api_token: process.env.SSLWAIRELESS_TOKEN,
                sid: msgInfo.sid ? msgInfo.sid : process.env.SSLWAIRELESS_SID1,
                msisdn: chunk,
                sms: msgInfo.sms,
                batch_csms_id: msgInfo.batch_csms_id,
              }
            );
            if (response.data.smsinfo) {
              multiResponse.push(...response.data.smsinfo);
            }
          }
          resolve(multiResponse);
        } catch (err) {
          reject(err);
        }
      })()
    );
  }

  dynamicMessage() {
    let msgInfo = this.msgInfo;
    return new Promise((resolve, reject) =>
      (async function () {
        try {
          const { sms } = msgInfo;
          let multiResponse = [];
          const chunkSize = 100;
          for (let i = 0; i < sms.length; i += chunkSize) {
            const chunk = sms.slice(i, i + chunkSize);
            // Req with chunks
            let response = await axios.post(
              process.env.SSLWAIRELESS_SMS_BASEURL + "/api/v3/send-sms/dynamic",
              {
                api_token: process.env.SSLWAIRELESS_TOKEN,
                sid: msgInfo.sid ? msgInfo.sid : process.env.SSLWAIRELESS_SID1,
                sms: [...chunk],
              }
            );
            if (response.data.smsinfo) {
              multiResponse.push(...response.data.smsinfo);
            }
          }
          resolve(multiResponse);
        } catch (err) {
          reject(err);
        }
      })()
    );
  }
}

module.exports = { TextMessage };
