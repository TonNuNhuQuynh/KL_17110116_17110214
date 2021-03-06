export class ActivityStorage 
{
    rateIds: number[];
    movieLikeIds: number[];
    reviewLikes: ReviewLike[];
}
export class ReviewLike 
{
    accountId: number;
    reviewId: number;
    liked: boolean;
    disLiked: boolean;
}
export class Account {
    id: number;
    username: string;
    email: string;
    phone: string;
    password: string;
    isActive: boolean;
    roleName: string;
    user: User;
}
export class Role 
{
    id: number;
    name: string;
}
export class User {
    fullname: string;
    area: string;
    image: string;
    accountId: number;
}