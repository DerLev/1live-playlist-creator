import {JSDOM} from "jsdom";

const get1LiveNewReleases = async () => {
  const response = await fetch(
    "https://www1.wdr.de/radio/1live/musik/neu-fuer-den-sektor/" +
    "nfds-sonntag-mit-philipp-isterewicz100.html",
    {
      method: "GET",
    }
  );

  const html = await response.text();

  const dom = new JSDOM(html);

  const programmTable = dom.window.document
    .querySelector("div.box.modTable > div.table > table.thleft > tbody");
  const programmItems = programmTable
    ?.querySelectorAll("tr.data");

  if (!programmItems?.length) {
    throw new Error("Cannot get programm! Has the site layout changed?");
  }

  const daysToSunday = new Date().getDay();
  const programmDateObject = new Date(
    Date.now() - (daysToSunday * 24 * 60 * 60 * 1000)
  );

  const formattedProgramm = Array.from(programmItems)
    .map((element) => {
      const dataItems = Array.from(element.querySelectorAll("td.entry"));

      const title = dataItems[1]?.textContent;
      const artist = dataItems[0]?.textContent;

      /* Sort out hour markers */
      if (!artist?.length || !title?.length) return;

      return {
        title,
        artist,
        played: programmDateObject,
      };
    })
    .filter((item) => item !== undefined) as {
      title: string,
      artist: string,
      played: Date
      order: number
    }[];

  return formattedProgramm;
};

export default get1LiveNewReleases;
