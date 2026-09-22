import { CallableRequest } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { AppError } from '../utils/errors';
import { UserDoc } from '../types/user.types';
import { COLLECTIONS } from '../utils/constants';

export interface AuthenticatedUserContext {
  uid: string;
  email?: string | null;
  userDoc?: UserDoc | null;
}

export async function authenticateCallableUser(
  request: CallableRequest<unknown>
): Promise<AuthenticatedUserContext> {
  if (!request.auth || !request.auth.uid) {
    throw new AppError('UNAUTHENTICATED', 'Authentication is required to perform this action.');
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || null;

  const userSnapshot = await db.collection(COLLECTIONS.USERS).doc(uid).get();

  if (userSnapshot.exists) {
    const userData = userSnapshot.data() as UserDoc;
    if (userData.account_status === 'deletion_pending') {
      throw new AppError(
        'ACCOUNT_DELETION_PENDING',
        'Your account is currently scheduled for deletion. Access to active features is restricted.'
      );
    }
    if (userData.account_status === 'deleted') {
      throw new AppError('PERMISSION_DENIED', 'This account has been deleted.');
    }

    return {
      uid,
      email,
      userDoc: userData,
    };
  }

  return {
    uid,
    email,
    userDoc: null,
  };
}
