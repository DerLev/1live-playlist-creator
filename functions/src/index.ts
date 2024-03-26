import {setGlobalOptions} from "firebase-functions/v2/options";

setGlobalOptions({
  maxInstances: 1,
  memory: "256MiB",
  region: "europe-west1",
  timeoutSeconds: 30,
});

export * from "./playlistScraping/index";
export * from "./spotifyApi/index";
