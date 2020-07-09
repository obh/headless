const { GeneralError } = require('../utils/errors');
const Const = require('../svcConstants');

const handleErrors = (err, req, res, next) => {
  if (err instanceof GeneralError) {
    return res.status(err.getCode()).json({
      Status: Const.RESPONSE_STATUS_ERROR,
      Message: err.message
    });
  }

  return res.status(500).json({
    Status: Const.RESPONSE_STATUS_ERROR,
    Message: err.message
  });
}


module.exports = handleErrors;
