export class MovieDetails {
    movie: Movie;
    ratings: number;
    genres: string;
    directors: string[];
    producers: string[];
}
export class Movie {
    id: number;
    originalTitle: string;
    title: string;
    plot: string;
    directors: string;
    producers: string;
    releaseDate: Date;
    runtime: number;
    ageRating: string;
    poster: string;
    backdrop: string;
    trailer: string;
    imdb: number;
    languageId: number;
    movieStatusId: number;
    genres: number[];
    casts: Cast[];
    accountId: number;
    createdDate: Date;
}
export class Cast {
    name: string;
    character: string;
    movieId: number;
}