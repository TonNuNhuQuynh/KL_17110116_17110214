export class Post
{
    id: number;
    title: string;
    summary: string;
    cover: string;
    content: string;
    postType: any;
    postTypeId: number;
    postTheme: any;
    postThemeId: number;
    spoilers: boolean;
    movie: any
    movieId: number;
    keywords: string;
    status: number;
    accountId: number;
    account: any;
    isDeleted: boolean;
    publishedDate: Date;
    createdDate: Date;
    task: any;
    feedbacks: any[];
}