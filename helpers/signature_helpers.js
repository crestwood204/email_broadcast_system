const Models = require('../models/models');

const { User } = Models;

const matchSignature = async (body) => {
  const signatureRegex = /\.~[a-zA-Z0-9]*[a-zA-Z]+[a-zA-Z0-9]*/; // regex for username
  const match = body.match(signatureRegex);
  if (match) {
    return User.findOne({ username: match[0].substring(2) }).then(
      (user) => {
        if (!user) {
          return body.replace(match[0], 'user not found');
        }

        if (!user.signature) {
          return body.replace(match[0], 'user does not have an associated signature');
        }
        const src = user.signature.filename;
        const image = `<img src="/user_data/signatures/${src}"></img>`;
        return body.replace(match[0], image);
      },
      (matchErr) => {
        console.log('Error:', matchErr);
        return body.replace(match[0], 'signature failed to upload');
      }
    );
  }
  return new Promise((resolve) => {
    resolve(body);
  });
};

module.exports = { matchSignature };
