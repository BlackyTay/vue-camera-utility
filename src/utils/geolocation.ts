export const getGeolocation = (
  options: PositionOptions = {}
): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(err.message ? err.message : String(err))
    }, options)
  })
}