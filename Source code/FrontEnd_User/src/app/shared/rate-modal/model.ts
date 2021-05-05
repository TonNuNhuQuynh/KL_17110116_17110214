import { Movie } from "../../movie-details/model";

export class Review {
    id: number;
    content: string;
    ratings: number;
    spoilers: boolean;
    createdDate: Date;
    movie: Movie;
    movieId: number;
    accountId: number;
}