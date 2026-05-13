/**
 * Google OAuth Authentication Handler
 * Verifies Google ID tokens and extracts user profile information
 * No user data is stored - only used for session validation
 */

import axios from 'axios';
import { GoogleIdentity } from './types';

const GOOGLE_TOKEN_VERIFY_URL = 'https://www.googleapis.com/oauth2/v1/tokeninfo';

/**
 * Verify Google ID token and extract user profile
 * @param idToken - Google ID token from frontend
 * @returns User profile extracted from token
 * @throws Error if token is invalid
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleIdentity> {
  try {
    const response = await axios.get(GOOGLE_TOKEN_VERIFY_URL, {
      params: {
        id_token: idToken
      }
    });

    const { email, name, picture } = response.data;

    if (!email) {
      throw new Error('Invalid token: no email found');
    }

    return {
      email,
      name: name || email.split('@')[0],
      profileImage: picture || null
    };
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : String(error));
    throw new Error('Invalid authentication token');
  }
}
