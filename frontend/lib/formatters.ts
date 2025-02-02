/**
 * Formats a number into a more human readable format
 * @param {Number} number Number to be formatted
 * @returns {String} String with correct format
 */
export const numberFormatter = (number: number) =>
  new Intl.NumberFormat('en-US').format(number)

/**
 * Converts a time in ms to a human readable string
 * @param {Number} msTotal Time in ms to convert into string
 * @returns {String} String that shows the time with hours, minutes, seconds
 */
export const msToTime = (msTotal: number) => {
  const ms = msTotal % 1000
  const secTotal = (msTotal - ms) / 1000
  const sec = secTotal % 60
  const minTotal = (secTotal - sec) / 60
  const min = minTotal % 60
  const hrs = (minTotal - min) / 60

  const needsHrs = hrs > 0 ? `${hrs}:${min.toString().padStart(2, '0')}` : min

  return `${needsHrs}:${sec.toString().padStart(2, '0')}`
}
