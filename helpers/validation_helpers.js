/* eslint no-fallthrough: "error" */

/**
 * Validates email using regex.
 * @param {string} email The email
 * @returns {boolean} Whether or not the email is valid
 */
const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};

/**
 * Validates a string to be used in a regex
 * @param {string} query The query specified by the user
 * @returns {string} returns a string with all regex characters escaped
 */
const escapeRegExp = query => query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validates a string before used to create a new date
 * @param {string} dateString The date specified by the user
 * @returns {boolean} returns a boolean based on if the dateString is of the correct format
 */
const validateDateString = dateString => dateString.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);

/**
  * Creates a search object for mongoose query
  * @param {string} search String that the user entered
  * @param {string} dateParam The key that specifies date created in the associated model
  * @returns {Object} The search object
  */
const createSearchObject = (search, dateParam) => {
  const searchObj = {};

  if (search) {
    const date = dateParam;

    // checks all fields are lowercase and without trailing spaces and that you can escape ':'
    const split = search.match(/([^\\\][^:]|\\:)+/g).map(x => x.trim().toLowerCase().split('\\').join(''));
    let [type] = split;
    if (type === 'Date') {
      type = 'date';
    }
    switch (split.length) {
      // case for specifying a type
      case 2:
        if ((type === 'date' || type === 'before' || type === 'after') && validateDateString(split[1])) {
          const year = parseInt(split[1].substring(0, 4), 10);
          const month = parseInt(split[1].substring(5, 7), 10) - 1;
          const day = parseInt(split[1].substring(8, 10), 10);

          if (type === 'date') {
            searchObj[date] = {
              $lte: new Date(year, month, day + 1, 0, 0, 0, 0).toISOString(),
              $gte: new Date(year, month, day, 0, 0, 0, 0).toISOString()
            };
          }

          if (type === 'before') {
            searchObj[date] = { $lte: new Date(year, month, day, 0, 0, 0, 0).toISOString() };
          }

          if (type === 'after') {
            searchObj[date] = { $gte: new Date(year, month, day, 0, 0, 0, 0).toISOString() };
          }

          /*
           * database will error on string to boolean conversion.
           * search by pending is unwanted behavior
           */
        } else if (type === 'pending' || type === 'approved' || type === 'attachments') {
          searchObj.unwantedKey = 'unwanted';
        } else {
          searchObj[type] = { $regex: new RegExp(escapeRegExp(split[1]), 'ig') };
        }
        break;
      // for date cases
      case 3:
        if (split[0] === 'date' && validateDateString(split[1])) {
          // before -- after --
          if (validateDateString(split[2])) {
            const lowerBound = {
              year: parseInt(split[1].substring(0, 4), 10),
              month: parseInt(split[1].substring(5, 7), 10) - 1,
              day: parseInt(split[1].substring(8, 10), 10)
            };

            const upperBound = {
              year: parseInt(split[2].substring(0, 4), 10),
              month: parseInt(split[2].substring(5, 7), 10) - 1,
              day: parseInt(split[2].substring(8, 10), 10)
            };

            searchObj[date] = {
              $lte: new Date(
                upperBound.year,
                upperBound.month,
                upperBound.day,
                0,
                0,
                0,
                0
              ).add({ days: 1 }),
              $gte: new Date(lowerBound.year, lowerBound.month, lowerBound.day, 0, 0, 0, 0)
            };
            break;
          }
        }
        // falls through

      default:
        if (split.length === 1) {
          if (date === 'date') {
            searchObj.type = { $regex: new RegExp(escapeRegExp(split[0]), 'ig') };
          } else {
            searchObj.subject = { $regex: new RegExp(escapeRegExp(split[0]), 'ig') };
          }
        } else {
          searchObj.subject = { $regex: new RegExp(escapeRegExp(search), 'ig') };
        }
    }
  }
  return searchObj;
};

/**
  * Creates Search Object for Edit Pages
  * @param {Object} search The user inputed search string
  * @param {string} options 'group' if searching the group page
  * @returns {string} The resulting search object
  */
const createEditSearchObject = (search, options) => {
  const searchObj = {};

  if (search) {
    // checks all fields are lowercase and without trailing spaces and that you can escape ':'
    const split = search.match(/([^\\\][^:]|\\:)+/g).map(x => x.trim().toLowerCase().split('\\').join(''));
    let [type] = split;
    if (split.length === 2) {
      // boolean converter for group type
      if (options === 'group' && type === 'distribution') {
        type = 'type';
        if (split[1] === 'true') {
          split[1] = 'distribution';
        } else {
          split[1] = 'sender';
        }
      }
      if (options === 'template' && (type === 'created by' || type === 'createdby')) {
        type = 'username';
      }

      // boolean converter for user approver and active
      if (options === 'user' && (type === 'approver' || type === 'active')) {
        if (split[1] === 'true') {
          split[1] = true;
        } else {
          split[1] = false;
        }
        [, searchObj[type]] = split;
        return searchObj;
      }
      searchObj[type] = { $regex: new RegExp(escapeRegExp(split[1]), 'ig') };
    } else if (split.length === 1 && options === 'user') {
      searchObj.username = { $regex: new RegExp(escapeRegExp(search), 'ig') };
    } else {
      searchObj.name = { $regex: new RegExp(escapeRegExp(search), 'ig') };
    }
  }
  return searchObj;
};

module.exports = {
  validateEmail,
  createSearchObject,
  createEditSearchObject
};
