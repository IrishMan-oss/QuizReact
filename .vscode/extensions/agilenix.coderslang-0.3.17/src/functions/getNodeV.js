const check = require("check-node-version");
const { Bugsnag, onError } = require("../external/bugsnag");

function getNodeV (cb, context) {
  let currentV;
  let isSatisfied = false;
  check(
    { node: "> 14.0.0", },
    (error, result) => {
      if (error) {
        Bugsnag.notify(error, onError(context));
      }
      isSatisfied = result.isSatisfied;
      currentV = result?.versions?.node?.version?.version;
      cb({ currentV, isSatisfied });
    }
  );
}

module.exports = {
  getNodeV,
};
