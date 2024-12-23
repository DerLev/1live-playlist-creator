import {HttpsError, onCall} from "firebase-functions/v2/https";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import type {
  LoginNoncesCollection,
} from "../firestoreDocumentTypes/LoginNoncesCollection";
import {FieldValue} from "firebase-admin/firestore";
import * as Joi from "joi";

interface CreateRedirectBodySchema {
  local?: boolean
}

const createRedirectBodySchema = Joi.object<CreateRedirectBodySchema>({
  local: Joi.boolean(),
});

export const createRedirect = onCall(
  {
    secrets: ["SPOTIFY_CLIENT_ID"],
  },
  async (req) => {
    if (req.auth?.uid) {
      throw new HttpsError("unavailable", "Only available to logged out users");
    }

    const {error, value: body} = createRedirectBodySchema.validate(req.data);
    if (error) {
      throw new HttpsError("invalid-argument", error.details[0].message);
    }

    const nonceCollection = db.collection("loginNonces")
      .withConverter(firestoreConverter<LoginNoncesCollection>());

    const nonceDoc = nonceCollection.doc();
    await nonceDoc.create({
      createdAt: FieldValue.serverTimestamp(),
      nonce: nonceDoc.id,
      usedFor: "login",
    });

    const oAuthScopes = [
      "playlist-modify-public",
      "playlist-modify-private",
    ];

    const oAuthParams = new URLSearchParams();
    oAuthParams.append("response_type", "code");
    oAuthParams.append("client_id", process.env.SPOTIFY_CLIENT_ID || "");
    oAuthParams.append(
      "redirect_uri",
      body.local ? "http://localhost:3000/callback" :
        "https://playlists.derlev.xyz/callback"
    );
    oAuthParams.append("state", nonceDoc.id);
    oAuthParams.append("scope", oAuthScopes.join(" "));
    oAuthParams.append("show_dialog", "false");

    const spotifyOAuthRedirect = "https://accounts.spotify.com/authorize?" +
      oAuthParams.toString();

    return {
      nonce: nonceDoc.id,
      authUrl: spotifyOAuthRedirect,
    };
  }
);
