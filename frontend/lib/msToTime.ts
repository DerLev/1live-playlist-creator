/**
 * Convert a time in ms to a human readable string
 * @param {Number} msTotal Time in ms to convert into string
 * @returns {String} String that shows the time with hours, minutes, seconds
 */
const msToTime = (msTotal: number) => {
  const ms = msTotal % 1000
  const secTotal = (msTotal - ms) / 1000
  const sec = secTotal % 60
  const minTotal = (secTotal - sec) / 60
  const min = minTotal % 60
  const hrs = (minTotal - min) / 60

  const needsHrs = hrs > 0 ? `${hrs}:${min.toString().padStart(2, '0')}` : min

  return `${needsHrs}:${sec.toString().padStart(2, '0')}`
}

export default msToTime
