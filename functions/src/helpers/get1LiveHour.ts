import {JSDOM} from "jsdom";

const get1LiveHour = async (
  date: string,
  hour: number,
  station: "1live" | "1liveDiggi" = "1live"
) => {
  const body = new URLSearchParams();
  body.append("playlistSearch_date", date);
  body.append("playlistSearch_hours", hour.toString().padStart(2, "0"));
  body.append("playlistSearch_minutes", "30");
  body.append("submit", "suchen");

  const requestUrl = station === "1live" ?
    "https://www1.wdr.de/radio/1live/musik/playlist/index.jsp" :
    "https://www1.wdr.de/radio/1live-diggi/onair/1live-diggi-playlist/index.jsp";

  const response = await fetch(
    requestUrl,
    {
      method: "POST",
      body: body,
    }
  );

  const html = await response.text();

  const dom = new JSDOM(html);

  const searchResultElement = dom.window.document
    .getElementById("searchPlaylistResult");
  const searchResultTable = searchResultElement
    ?.querySelector("table.thleft")?.querySelector("tbody");
  const searchResultArr = searchResultTable
    ?.querySelectorAll("tr.data");

  if (!searchResultArr?.length) {
    throw new Error("Search results are empty. Hour: " + hour);
  }

  const formattedSearchResults = Array.from(searchResultArr)
    .map((element) => {
      const title = element.querySelector("td.title")
        ?.textContent?.replace(/\n/g, "");
      const artist = element.querySelector("td.performer")
        ?.textContent?.replace(/\n/g, "");
      const played = element.querySelector("th.datetime")
        ?.textContent?.replace(/\n/g, "");

      if (!artist?.length || !played?.length || !title?.length) return;

      const formattedDate = played.replace(",", ".").replace(" Uhr", "");
      /* items in array are [day, month, year, hour, minute] */
      const dateArray = formattedDate.split(".");
      const dateISOString = dateArray[2] + "-" + dateArray[1] + "-" +
        dateArray[0] + "T" + dateArray[3] + ":" + dateArray[4] + ":00.000";
      const dateObject = new Date(Date.parse(dateISOString));

      return {
        title,
        artist,
        played: dateObject,
      };
    })
    .filter((item) => item !== undefined) as {
      title: string,
      artist: string,
      played: Date
    }[];

  return formattedSearchResults.sort(
    (a, b) => a.played.getTime() - b.played.getTime()
  );
};

export default get1LiveHour;
