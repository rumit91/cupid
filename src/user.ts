interface User {
    userId: string;
    userName: string;
    postingUserId: string;
    groupId: string;
    soId: string;
    alternateSoId: string;
    soName: string;
    accessToken: string;
    tokenExpiration: Date;
}

export = User;
