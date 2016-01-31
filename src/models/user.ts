interface User {
    userId: string;
    userName: string;
    groupId: string;
    soId: string;
    alternateSoId: string;
    soName: string;
    accessToken: string;
    tokenExpiration: Date;
    photoIdsWithSO: string[];
}

export = User;
