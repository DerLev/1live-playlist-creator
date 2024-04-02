import {setGlobalOptions} from "firebase-functions/v2/options";

setGlobalOptions({
  maxInstances: 1,
  memory: "256MiB",
  region: "europe-west1",
  timeoutSeconds: 30,
  secrets: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
});

export * from "./scheduled/index";

setGlobalOptions({
  maxInstances: 1,
  memory: "256MiB",
  region: "europe-west1",
  timeoutSeconds: 30,
});

export * from "./playlistScraping/index";
export * from "./userAuth/index";

/* Public API functions */

const publicApiESPv2Service = "public-api-espv2-service";
const projectSADomain = "einslive-playlist-creator.iam.gserviceaccount.com";

setGlobalOptions({
  maxInstances: 1,
  memory: "256MiB",
  region: "europe-west1",
  timeoutSeconds: 30,
  invoker: publicApiESPv2Service + "@" + projectSADomain,
});

export * from "./publicApiFunctions/index";
