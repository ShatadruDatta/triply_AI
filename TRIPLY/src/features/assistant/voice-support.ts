import { requireOptionalNativeModule } from 'expo';

// False when the installed app was built before `expo-audio` was added. Importing the library
// then throws, so callers must check this first and ask for a rebuild instead.
export const voiceSupported = requireOptionalNativeModule('ExpoAudio') != null;
