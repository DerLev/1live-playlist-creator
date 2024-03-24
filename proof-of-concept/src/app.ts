import { JSDOM } from "jsdom"

const main = async () => {
  const body = new URLSearchParams()
  body.append("playlistSearch_date", "2024-03-24")
  body.append("playlistSearch_hours", "19")
  body.append("playlistSearch_minutes", "00")
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

    return {
      title,
      artist,
      played
    }
  })

  console.log(formattedSearchResults)
}

main()
