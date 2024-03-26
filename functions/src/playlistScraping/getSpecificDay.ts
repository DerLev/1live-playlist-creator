import {HttpsError, onRequest} from "firebase-functions/v2/https";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import {ScrapesCollection} from "../firestoreDocumentTypes/ScrapesCollection";
import {Timestamp} from "firebase-admin/firestore";
import get1LiveHour from "../helpers/get1LiveHour";
import onlyAllowMethods from "../helpers/onlyAllowMethods";

export const getSpecificDay = onRequest(async (req, res) => {
  onlyAllowMethods(req, res, ["POST"]);

  const queryDate = req.query.date?.toString();
  if (!queryDate?.match(/\d{4}-\d{2}-\d{2}/)) {
    throw new HttpsError("invalid-argument", "Must be a valid date");
  }

  const scrapesCollection = db.collection("scrapes")
    .withConverter(firestoreConverter<ScrapesCollection>());

  const playlistExists = await scrapesCollection
    .where("date", "==", queryDate).get();
  if (!playlistExists.empty) {
    throw new HttpsError("already-exists", "This day was already scraped");
  }

  const promisesArr: Promise<{
    title: string;
    artist: string;
    played: Date;
  }[]>[] = [];

  for (let i = 0; i < 13; i++) {
    promisesArr.push(get1LiveHour(queryDate, 6 + i));
  }

  const results = (await Promise.all(promisesArr)).flat();

  const firestoreResults = results.map((item) => {
    return {
      ...item,
      played: Timestamp.fromDate(item.played),
    };
  });

  const newDoc = await scrapesCollection.add({
    date: queryDate,
    playlist: firestoreResults,
  });

  res.json({results, docId: newDoc.id});
});
