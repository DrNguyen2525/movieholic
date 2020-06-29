import { takeLatest, all, call, put } from 'redux-saga/effects';

import {
  signInSuccess,
  signInFailure,
  signOutSuccess,
  signOutFailure,
  signUpSuccess,
  signUpFailure,
  updateProfileSuccess,
  updateProfileFailure,
  uploadAvatarSuccess,
  uploadAvatarFailure,
  fetchUsersSuccess,
  fetchUsersFailure
} from './user.actions';

import {
  firestore,
  auth,
  facebookProvider,
  googleProvider,
  createUserProfileDocument,
  getCurrenUser,
  updateUserProfile,
  uploadUserAvatar,
  convertUsersSnapshotToMap
} from '../../firebase/firebase.utils';

import UserActionTypes from './user.types';

export function* getSnapshotFromUserAuth(userAuth, additionalData) {
  try {
    const userRef = yield call(
      createUserProfileDocument,
      userAuth,
      additionalData
    );
    const userSnapshot = yield userRef.get();
    yield put(
      signInSuccess({
        id: userSnapshot.id,
        ...userSnapshot.data()
      })
    );
  } catch (error) {
    yield put(signInFailure(error));
  }
}

export function* signInWithFacebook() {
  try {
    const { user } = yield auth.signInWithPopup(facebookProvider);
    yield getSnapshotFromUserAuth(user);
  } catch (error) {
    yield put(signInFailure(error));
  }
}

export function* signInWithGoogle() {
  try {
    const { user } = yield auth.signInWithPopup(googleProvider);
    yield getSnapshotFromUserAuth(user);
  } catch (error) {
    yield put(signInFailure(error));
  }
}

export function* signInWithEmail({ payload: { email, password } }) {
  try {
    const { user } = yield auth.signInWithEmailAndPassword(email, password);
    yield getSnapshotFromUserAuth(user);
  } catch (error) {
    yield put(signInFailure(error));
  }
}

export function* isUserAuthenticated() {
  try {
    const userAuth = yield call(getCurrenUser);
    if (!userAuth) return;
    yield getSnapshotFromUserAuth(userAuth);
  } catch (error) {
    yield put(signInFailure(error));
  }
}

export function* signOut() {
  try {
    yield auth.signOut();
    yield put(signOutSuccess());
  } catch (error) {
    yield put(signOutFailure(error));
  }
}

export function* signUp({ payload: { email, password, displayName } }) {
  try {
    const { user } = yield auth.createUserWithEmailAndPassword(email, password);
    yield put(signUpSuccess({ user, additionalData: { displayName } }));
  } catch (error) {
    yield put(signUpFailure(error));
  }
}

export function* signInAfterSignUp({ payload: { user, additionalData } }) {
  yield getSnapshotFromUserAuth(user, additionalData);
}

export function* updateProfileStart({ payload: { userId, profile } }) {
  try {
    const userRef = yield call(updateUserProfile, userId, profile);
    const userSnapshot = yield userRef.get();
    yield put(
      updateProfileSuccess({ id: userSnapshot.id, ...userSnapshot.data() })
    );
  } catch (error) {
    yield put(updateProfileFailure(error));
  }
}

export function* uploadAvatarStart({ payload: { userId, file } }) {
  try {
    const photoURL = yield call(uploadUserAvatar, userId, file);
    yield put(uploadAvatarSuccess());
    const userRef = yield call(updateUserProfile, userId, { photoURL });
    const userSnapshot = yield userRef.get();
    yield put(
      updateProfileSuccess({ id: userSnapshot.id, ...userSnapshot.data() })
    );
  } catch (error) {
    yield put(uploadAvatarFailure(error));
  }
}

export function* fetchUsersStart() {
  try {
    const collectionRef = firestore.collection('users');
    const snapshot = yield collectionRef.get();
    const users = yield call(convertUsersSnapshotToMap, snapshot);
    yield put(fetchUsersSuccess(users));
  } catch (error) {
    yield put(fetchUsersFailure(error.message));
  }
}

export function* onFacebookSignInStart() {
  yield takeLatest(UserActionTypes.FACEBOOK_SIGN_IN_START, signInWithFacebook);
}

export function* onGoogleSignInStart() {
  yield takeLatest(UserActionTypes.GOOGLE_SIGN_IN_START, signInWithGoogle);
}

export function* onEmailSignInStart() {
  yield takeLatest(UserActionTypes.EMAIL_SIGN_IN_START, signInWithEmail);
}

export function* onCheckUserSession() {
  yield takeLatest(UserActionTypes.CHECK_USER_SESSION, isUserAuthenticated);
}

export function* onSignOutStart() {
  yield takeLatest(UserActionTypes.SIGN_OUT_START, signOut);
}

export function* onSignUpStart() {
  yield takeLatest(UserActionTypes.SIGN_UP_START, signUp);
}

export function* onSignUpSuccess() {
  yield takeLatest(UserActionTypes.SIGN_UP_SUCCESS, signInAfterSignUp);
}

export function* onUpdateProfileStart() {
  yield takeLatest(UserActionTypes.UPDATE_PROFILE_START, updateProfileStart);
}

export function* onUploadAvatarStart() {
  yield takeLatest(UserActionTypes.UPLOAD_AVATAR_START, uploadAvatarStart);
}

export function* onFetchUsersStart() {
  yield takeLatest(UserActionTypes.FETCH_USERS_START, fetchUsersStart);
}

export function* userSagas() {
  yield all([
    call(onFacebookSignInStart),
    call(onGoogleSignInStart),
    call(onEmailSignInStart),
    call(onCheckUserSession),
    call(onSignOutStart),
    call(onSignUpStart),
    call(onSignUpSuccess),
    call(onUpdateProfileStart),
    call(onUploadAvatarStart),
    call(onFetchUsersStart)
  ]);
}
