interface User {
    userId: string;
    userName: string;
    groupId: string;
    soId: string;
    soName: string;
    accessToken: string;
    tokenExpiration: Date;
}

export = User;
