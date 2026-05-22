export type UserGender = 'male' | 'female';

export interface UserProfile {
  id: string;
  username: string;
  gender: UserGender;
}

export interface AuthPayload {
  idToken: string;
  dateOfBirth: string;
  username?: string;
  gender: UserGender;
}
