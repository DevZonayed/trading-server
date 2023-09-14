const axios = require("axios");
require("dotenv").config();
class SslWaireless {
  constructor(type = "balanceCheck", data = false) {
    this.type = type;
    this.data = data;
  }

  //   Mathod for check ballance
  checkBalance({ sid }) {
    if (this.type === "balanceCheck") {
      return axios.post(
        process.env.SSLWAIRELESS_SMS_BASEURL + "/api/v3/balance",
        {
          api_token: process.env.SSLWAIRELESS_TOKEN,
          sid: sid || process.env.SSLWAIRELESS_SID1,
        }
      );
    }
  }
}

module.exports = SslWaireless;
