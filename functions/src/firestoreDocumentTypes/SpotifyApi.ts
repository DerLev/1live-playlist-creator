export type SimplifiedArtistObject = {
  external_urls: {
    spotify: string
  }
  href: string
  id: string
  name: string
  type: "artist"
  uri: string
}

export type ImageObject = {
  url: string
  width: number | null
  height: number | null
}

export type ArtistObject = {
  external_urls: {
    spotify: string
  }
  followers: {
    href: string | null
    total: number
  }
  genres: string[]
  href: string
  id: string
  images: ImageObject[]
  name: string
  popularity: number
  type: "artist"
  uri: string
}

export type SpotifyError = {
  error: {
    status: number
    message: string
  }
}

export type Search = {
  tracks: {
    href: string
    limit: number
    next: string
    offset: number
    previous: string
    total: number
    items: {
      album: {
        album_type: "album" | "single" | "compilation"
        total_tracks: number
        available_markets: string[]
        external_urls: {
          spotify: string
        }
        href: string
        id: string
        images: ImageObject[]
        name: string
        release_date: string
        release_date_precision: "year" | "month" | "day"
        restrictions?: {
          reason: string
        }
        type: "album"
        uri: string
        artists: SimplifiedArtistObject[]
      }
      artists: ArtistObject[]
      available_markets: string[]
      disc_number: number
      duration_ms: number
      explicit: boolean
      external_ids: {
        isrc?: string
        ean?: string
        upc?: string
      }
      external_urls: {
        spotify: string
      }
      href: string
      id: string
      is_playable?: boolean
      linked_from?: object
      restrictions?: {
        reason: string
      }
      name: string
      popularity: number
      preview_url: string | null
      track_number: number
      type: "track"
      uri: string
      is_local: boolean
    }[]
  }
}