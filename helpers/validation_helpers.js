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
const validateDateString = dateString => dateString.matches(/[0-9]{4}-[0-9]{2}-[0-9]{2}/);

const createSearchObject = (search) => {
  const searchObj = {};

  if (search) {
    // makes sure all fields are consistently lowercase and without trailing spaces
    const split = search.split(':').map(x => x.trim().toLowerCase());
    const [type] = split;
    switch (split.length) {
      // case for specifying a type
      case 2:
        if (type === 'date') {
          if (validateDateString()) {
            const year = parseInt(search.substring(0, 4), 10);
            const month = parseInt(search.substring(5, 7), 10);
            const day = parseInt(search.substring(8, 10), 10);
            searchObj.dateApproved = {
              $lte: new Date(year, month, day, 0, 0, 0, 0).toISOString(),
              $gte: new Date(year, month, day + 1, 0, 0, 0, 0).toISOString()
            };
          }
        } else {
          searchObj[type] = { $regex: new RegExp(escapeRegExp(search), 'ig') };
        }
        break;
      // for date cases
      case 3:
        if (split[0] === 'date' && validateDateString(search)) {
          if ((split[2] === 'before' || split[2] === 'after')) {
            const year = parseInt(search.substring(0, 4), 10);
            const month = parseInt(search.substring(5, 7), 10);
            const day = parseInt(search.substring(8, 10), 10);

            if (split[2] === 'before') {
              searchObj.dateApproved = {
                $lte: new Date(year, month, day, 0, 0, 0, 0)
                  .toISOString()
              };
            }

            if (split[2] === 'after') {
              searchObj.dateApproved = {
                $gte: new Date(year, month, day, 0, 0, 0, 0)
                  .toISOString()
              };
            }
            break;
          }
          // before -- after --
          if (validateDateString(split[2])) {
            const lowerBound = {
              year: parseInt(search.substring(0, 4), 10),
              month: parseInt(search.substring(5, 7), 10),
              day: parseInt(search.substring(8, 10), 10)
            };

            const upperBound = {
              year: parseInt(split[2].substring(0, 4), 10),
              month: parseInt(split[2].substring(5, 7), 10),
              day: parseInt(split[2].substring(8, 10), 10)
            };

            searchObj.dateApproved = {
              $lte: new Date(lowerBound.year, lowerBound.month, lowerBound.day, 0, 0, 0, 0),
              $gte: new Date(upperBound.year, upperBound.month, upperBound.day, 0, 0, 0, 0)
            };
          }
        }
        // falls through

      default:
        searchObj.subject = { $regex: new RegExp(escapeRegExp(search), 'ig') };
    }
  }
  return searchObj;
};

module.exports = {
  validateEmail,
  createSearchObject
};
