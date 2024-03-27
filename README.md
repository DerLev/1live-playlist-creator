# 1live-playlist-creator

[![CI/CD](https://github.com/DerLev/1live-playlist-creator/actions/workflows/integration-deployment.yml/badge.svg?branch=main&event=push)](https://github.com/DerLev/1live-playlist-creator/actions/workflows/integration-deployment.yml)

An application for creating playlists from the German radio station 1LIVE

## Roadmap

- [x] Create a proof-of-concept
- [x] Create a GCP/Firebase project and translate POC into a working app (gather data as other parts get finished)
- [x] Add logic to interface with the Spotify API and create pre-made playlists on my personal account
- [ ] Add a webapp (most likely React/Next.js) to give users more insights on the playlists (show gathered data)
- [x] Add a job for filling up the backlog *(already done by hand)*
- [x] Expand to other 1LIVE plalists (Neu für den Sektor, DIGGI)
- [x] Add function to replace tracks that have been wrongly mapped
- [ ] Add a public facing API for everyone to use
- [ ] Reconsider region of Cloud Functions (thought v2 was still only in ew1 - Firestore is located in ew3)
- [ ] Set up alerts for errors
