import { JSDOM } from "jsdom"

const main = async () => {
  const body = new URLSearchParams()
  body.append("playlistSearch_date", "2023-09-13")
  body.append("playlistSearch_hours", "09")
  body.append("playlistSearch_minutes", "30")
  body.append("submit", "suchen")

  const response = await fetch("https://www1.wdr.de/radio/1live/musik/playlist/index.jsp", {
    method: 'POST',
    body: body
  })

  const html = await response.text()

  const dom = new JSDOM(html)

  const searchResultElement = dom.window.document.getElementById("searchPlaylistResult")
  const searchResultTable = searchResultElement?.querySelector("table.thleft")?.querySelector("tbody")
  const searchResultArr = searchResultTable?.querySelectorAll("tr.data")
  
  if(!searchResultArr?.length) throw new Error("Search results are empty")

  const formattedSearchResults = Array.from(searchResultArr).map((element) => {
    const title = element.querySelector("td.title")?.textContent?.replace(/\n/g, "")
    const artist = element.querySelector("td.performer")?.textContent?.replace(/\n/g, "")
    const played = element.querySelector("th.datetime")?.textContent?.replace(/\n/g, "")

    if(!artist?.length || !played?.length || !title?.length) return

    const formattedDate = played.replaceAll(",", ".").replace(" Uhr", "")
    /* items in array are [day, month, year, hour, minute] */
    const dateArray = formattedDate.split(".")
    const dateISOString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${dateArray[3]}:${dateArray[4]}:00.000Z`
    const dateObject = new Date(Date.parse(dateISOString))

    return {
      title,
      artist,
      played: dateObject
    }
  }).filter((item) => item !== undefined) as {title: string, artist: string, played: Date}[]

  const orderedSearchResults = formattedSearchResults.sort((a, b) => a.played.getTime() - b.played.getTime())

  console.log(orderedSearchResults)
}

main()
