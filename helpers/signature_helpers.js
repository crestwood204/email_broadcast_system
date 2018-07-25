const Models = require('../models/models');

const { User } = Models;

const matchSignature = async (body) => {
  const signatureRegex = /\.~[a-zA-Z0-9]*[a-zA-Z]+[a-zA-Z0-9]*/; // regex for username
  const match = body.match(signatureRegex);
  if (match) {
    return User.findOne({ username: match[0].substring(2) }).then(
      (user) => {
        if (!user) {
          return [null, body.replace(match[0], 'user not found'), null];
        }

        if (!user.signature) {
          return [null, body.replace(match[0], 'user does not have an associated signature'), user.signatureLastUpdated];
        }
        const src = user.signature.filename;
        const image = `<img src="/user_data/signatures/${src}"></img>`;
        return [src, body.replace(match[0], image), user.signatureLastUpdated];
      },
      (matchErr) => {
        console.log('Error:', matchErr);
        return [null, body.replace(match[0], 'signature failed to upload'), null];
      }
    );
  }
  return new Promise((resolve) => {
    resolve([null, body]);
  });
};

module.exports = { matchSignature };
