import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as Joi from "joi";
import {auth, db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import type {
  LoginNoncesCollection,
} from "../firestoreDocumentTypes/LoginNoncesCollection";
import {
  GetCurrentUserProfile,
  SpotifyError,
} from "../firestoreDocumentTypes/SpotifyApi";
import * as logger from "firebase-functions/logger";
import {
  UserTokensDoc,
  UsersCollection,
} from "../firestoreDocumentTypes/UsersCollection";
import {Timestamp} from "firebase-admin/firestore";

interface LoginWithCodeBodySchema {
  nonce: string
  code: string
  local?: boolean
}

const loginWithCodeBodySchema = Joi.object<LoginWithCodeBodySchema>({
  code: Joi.string().required(),
  nonce: Joi.string().required(),
  local: Joi.boolean(),
});

export const loginWithCode = onCall(
  {
    secrets: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
  },
  async (req) => {
    if (req.auth?.uid) {
      throw new HttpsError("unavailable", "Only available to logged out users");
    }

    const {error, value: body} = loginWithCodeBodySchema.validate(req.data);
    if (error) {
      throw new HttpsError("invalid-argument", error.details[0].message);
    }

    /* Check if "state" is in nonces collection */
    const loginNoncesCollection = db.collection("loginNonces")
      .withConverter(firestoreConverter<LoginNoncesCollection>());

    const nonceDoc = await loginNoncesCollection.doc(body.nonce).get();

    /* Abort if nonce was not registered */
    if (!nonceDoc.exists) {
      throw new HttpsError("not-found", "Login nonce does not exist");
    }

    /* Delete nonce */
    await nonceDoc.ref.delete();

    /* Spotify Web API token exchange */
    const tokenExchangeBody = new URLSearchParams();
    tokenExchangeBody.append(
      "redirect_uri",
      body.local ? "http://localhost:3000/callback" :
        "https://playlists.derlev.xyz/callback"
    );
    tokenExchangeBody.append("grant_type", "authorization_code");
    tokenExchangeBody.append("code", body.code);

    const authHeader = Buffer.from(
      process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
    ).toString("base64");

    const tokenExchangeResult = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        body: tokenExchangeBody.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
      }
    ).then((res) => res.json()) as {
      access_token: string
      token_type: "Bearer"
      expires_in: number,
      scope: string,
      refresh_token: string
    } | SpotifyError;

    /* Abort if Spotify API throws error */
    if ("error" in tokenExchangeResult) {
      logger.error("Token exchange failed!", {tokenExchangeResult});
      throw new HttpsError("internal", "Spotify Web API returned an error");
    }

    const tokenExpiresIn = new Date().getTime() + (1000 * 60 * 60);
    const tokenCreatedAt = new Date().getTime();

    /* Get the user's profile */
    const userProfileResult = await fetch(
      "https://api.spotify.com/v1/me",
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + tokenExchangeResult.access_token,
        },
      }
    ).then((res) => res.json()) as GetCurrentUserProfile | SpotifyError;

    /* Abort if Spotify API throws an error */
    if ("error" in userProfileResult) {
      logger.error("User profile fetch!", {userProfileResult});
      throw new HttpsError("internal", "Spotify Web API returned an error");
    }

    /* Get the user from AuthDB */
    const authDbUser = await auth.getUser(userProfileResult.id)
      .then((res) => ({exists: true as const, record: res}))
      .catch(() => ({exists: false as const}));

    const userPhoto = userProfileResult.images
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0];

    let userLoginToken: string;
    let updateUserInfo = false;

    if (authDbUser.exists) {
      /* Disallow disabled users from signing in */
      if (authDbUser.record.disabled) {
        throw new HttpsError("permission-denied", "User account is disabled");
      }

      /* If email, profile pic, or name has been changed update it */
      if (
        authDbUser.record.photoURL !== userPhoto.url ||
        authDbUser.record.displayName !== userProfileResult.display_name ||
        authDbUser.record.email !== userProfileResult.email
      ) {
        updateUserInfo = true;
        await auth.updateUser(authDbUser.record.uid, {
          photoURL: userPhoto.url,
          email: userProfileResult.email,
          displayName: userProfileResult.display_name,
        });
      }

      /* Create a Firebase Login Token for the frontend */
      userLoginToken = await auth.createCustomToken(userProfileResult.id);
    } else {
      /* If the user does not exist in AuthDB create it */
      await auth.createUser({
        disabled: false,
        displayName: userProfileResult.display_name,
        uid: userProfileResult.id,
        photoURL: userPhoto.url || undefined,
      });

      /* Create a Firebase Login Token for the frontend */
      userLoginToken = await auth.createCustomToken(userProfileResult.id);
    }

    /* Get the user doc from Firestore */
    const usersCollection = db.collection("users")
      .withConverter(firestoreConverter<UsersCollection>());

    const userDoc = await usersCollection.doc(userProfileResult.id).get();

    if (userDoc.exists && updateUserInfo) {
      /* Update Firestore doc if user info has changed */
      userDoc.ref.update({
        displayName: userProfileResult.display_name,
        photoURL: userPhoto.url,
      });
    } else if (!userDoc.exists) {
      /* Create doc if not yet in Firestore */
      await userDoc.ref.create({
        accountStatus: "active",
        displayName: userProfileResult.display_name,
        photoURL: userPhoto.url,
        uid: userDoc.id,
      });
    }

    /* Create/Update the Token doc in Firestore */
    const tokenDoc = userDoc.ref.collection("system").doc("tokens")
      .withConverter(firestoreConverter<UserTokensDoc>());

    await tokenDoc.set({
      accessToken: tokenExchangeResult.access_token,
      refreshToken: tokenExchangeResult.refresh_token,
      tokenCreatedAt: Timestamp.fromMillis(tokenCreatedAt),
      tokenValidUntil: Timestamp.fromMillis(tokenExpiresIn),
    });

    /* Return the Firebase frontend login token */
    return {
      loginToken: userLoginToken,
    };
  }
);
