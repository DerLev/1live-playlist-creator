import {HttpsError} from "firebase-functions/v2/https";
import {ProjectCredentials} from "../firestoreDocumentTypes/ProjectCredentials";
import {db} from "./firebase";
import firestoreConverter from "./firestoreConverter";
import {FieldValue, Timestamp} from "firebase-admin/firestore";

const getClientToken = async () => {
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

  const clientId = creds.spotify.application.clientId;
  const clientSecret = creds.spotify.application.clientSecret;
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

  const currentTokenValidUntil = creds.spotify.playlistUser.tokenValidUntil
    .toMillis();
  const currentDateTime = new Date().getTime();
  if ((currentTokenValidUntil - currentDateTime) > (1000 * 60)) {
    return creds.spotify.playlistUser.accessToken;
  }

  const clientId = creds.spotify.application.clientId;
  const clientSecret = creds.spotify.application.clientSecret;
  const authHeader = Buffer.from(clientId + ":" + clientSecret)
    .toString("base64");

  const formDataBody = new URLSearchParams();
  formDataBody.append("grant_type", "refresh_token");
  formDataBody.append("refresh_token", creds.spotify.playlistUser.refreshToken);

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

  await credDoc.update({
    "spotify.playlistUser": {
      accessToken: result.access_token,
      refreshToken: creds.spotify.playlistUser.refreshToken,
      tokenCreatedAt: FieldValue.serverTimestamp(),
      tokenValidUntil: Timestamp.fromMillis(tokenExpiresIn),
    },
  });

  return result.access_token;
};

export {getClientToken, getUserToken};
