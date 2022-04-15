export function getDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}_${month}_${day}`;
}

export function isReview(learn: number, review: number, reviewTarget: number | undefined): boolean {
    return !!(learn === 0 && (!reviewTarget || (reviewTarget && review < reviewTarget)));
}
