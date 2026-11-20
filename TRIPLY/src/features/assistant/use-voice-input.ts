import { Alert } from 'react-native';

import { strings } from '@/lib/strings';

import type { VoiceInput } from './use-recorder-voice-input';
import { voiceSupported } from './voice-support';

export type { VoiceState } from './use-recorder-voice-input';

// Stand-in for a build without the audio module: tapping the mic explains what to do.
function useUnsupportedVoiceInput(): VoiceInput {
  return {
    state: 'idle',
    toggle: () => Alert.alert(strings.assistant.voiceUnsupportedTitle, strings.assistant.voiceUnsupportedBody),
  };
}

// `expo-audio` is only loaded when its native module exists, so an older build keeps working.
// The choice is made once at startup, so the hook order never changes between renders.
export const useVoiceInput: (onText: (text: string) => void) => VoiceInput = voiceSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./use-recorder-voice-input') as typeof import('./use-recorder-voice-input')).useRecorderVoiceInput
  : useUnsupportedVoiceInput;
