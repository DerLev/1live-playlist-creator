import {HttpsError} from "firebase-functions/v2/https";
import {ProjectCredentials} from "../firestoreDocumentTypes/ProjectCredentials";
import {db} from "./firebase";
import firestoreConverter from "./firestoreConverter";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {UserTokensDoc} from "../firestoreDocumentTypes/UsersCollection";

const getClientToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId?.length || !clientSecret?.length) {
    throw new Error("Client ID and/or Client Secret are not in ENV");
  }

  const credDoc = db.collection("project")
    .withConverter(firestoreConverter<ProjectCredentials>())
    .doc("credentials");
  const creds = (await credDoc.get()).data();

  if (!creds) {
    throw new HttpsError(
      "failed-precondition",
      "Credentials doc does not exist"
    );
  }

  const currentTokenValidUntil = creds.spotify.clientCredentials.tokenValidUntil
    .toMillis();
  const currentDateTime = new Date().getTime();
  if ((currentTokenValidUntil - currentDateTime) > (1000 * 60)) {
    return creds.spotify.clientCredentials.accessToken;
  }

  const authHeader = Buffer.from(clientId + ":" + clientSecret)
    .toString("base64");

  const formDataBody = new URLSearchParams();
  formDataBody.append("grant_type", "client_credentials");

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
    },
    body: formDataBody,
  }).then((res) => res.json()) as {
    access_token: string
    token_type: "bearer"
    expires_in: number
  };

  const tokenExpiresIn = new Date().getTime() + (1000 * 60 * 60);

  await credDoc.update({
    "spotify.clientCredentials": {
      accessToken: result.access_token,
      tokenCreatedAt: FieldValue.serverTimestamp(),
      tokenValidUntil: Timestamp.fromMillis(tokenExpiresIn),
    },
  });

  return result.access_token;
};

const getUserToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId?.length || !clientSecret?.length) {
    throw new Error("Client ID and/or Client Secret are not in ENV");
  }

  const tokenDoc = db.collection("users").doc("levin-111").collection("system")
    .doc("tokens").withConverter(firestoreConverter<UserTokensDoc>());
  const tokens = await (await tokenDoc.get()).data();

  if (!tokens) {
    throw new HttpsError(
      "failed-precondition",
      "Tokens doc does not exist"
    );
  }

  const currentTokenValidUntil = tokens.tokenValidUntil.toMillis();
  const currentDateTime = new Date().getTime();
  if ((currentTokenValidUntil - currentDateTime) > (1000 * 60)) {
    return tokens.accessToken;
  }

  const authHeader = Buffer.from(clientId + ":" + clientSecret)
    .toString("base64");

  const formDataBody = new URLSearchParams();
  formDataBody.append("grant_type", "refresh_token");
  formDataBody.append("refresh_token", tokens.refreshToken);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
    },
    body: formDataBody,
  }).then((res) => res.json()) as {
    access_token: string
    token_type: "Bearer"
    expires_in: number,
    scope: string
  };

  const tokenExpiresIn = new Date().getTime() + (1000 * 60 * 60);

  await tokenDoc.update({
    accessToken: result.access_token,
    refreshToken: tokens.refreshToken,
    tokenCreatedAt: FieldValue.serverTimestamp(),
    tokenValidUntil: Timestamp.fromMillis(tokenExpiresIn),
  });

  return result.access_token;
};

export {getClientToken, getUserToken};
