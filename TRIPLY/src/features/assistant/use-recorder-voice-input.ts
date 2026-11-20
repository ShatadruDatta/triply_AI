import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { ApiError } from '@/lib/api';
import { reportClientError } from '@/lib/report-error';
import { strings } from '@/lib/strings';

import { useTranscribe } from './queries';

function voiceFailureMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0) return strings.assistant.voiceNetworkBody;
    // 4xx messages are written for the user ("The recording was empty."); add the code in dev.
    if (error.status < 500) return __DEV__ ? `${error.message} (${error.status} ${error.code})` : error.message;
    return __DEV__ ? `${strings.assistant.voiceServerBody} (${error.status} ${error.code})` : strings.assistant.voiceServerBody;
  }
  return strings.assistant.voiceTranscribeBody;
}

// A voice question is short; stop on our own so a forgotten recording can't run forever.
const MAX_RECORDING_MS = 60_000;

export type VoiceState = 'idle' | 'recording' | 'transcribing';
export type VoiceInput = { state: VoiceState; toggle: () => void };

// Tap once to start recording, tap again to stop. The spoken text is passed to `onText`.
export function useRecorderVoiceInput(onText: (text: string) => void): VoiceInput {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const transcribe = useTranscribe();
  const [starting, setStarting] = useState(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state: VoiceState = transcribe.isPending
    ? 'transcribing'
    : recorderState.isRecording || starting
      ? 'recording'
      : 'idle';

  const clearTimer = () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
  };

  const stop = async () => {
    clearTimer();
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch (error) {
      reportClientError(error);
      Alert.alert(strings.assistant.voiceErrorTitle, strings.assistant.voiceErrorBody);
      return;
    }
    const uri = recorder.uri;
    if (!uri) return;
    transcribe.mutate(uri, {
      onSuccess: (text) => {
        if (text) onText(text);
        else Alert.alert(strings.assistant.voiceNoSpeechTitle, strings.assistant.voiceNoSpeechBody);
      },
      onError: (error) => {
        // Network and server problems are reported; the alert says which kind it was.
        if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500) {
          reportClientError(error);
        }
        Alert.alert(strings.assistant.voiceErrorTitle, voiceFailureMessage(error));
      },
    });
  };

  const start = async () => {
    setStarting(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(strings.assistant.micDeniedTitle, strings.assistant.micDeniedBody, [
          { text: strings.assistant.cancel, style: 'cancel' },
          { text: strings.assistant.openSettings, onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      stopTimer.current = setTimeout(() => void stop(), MAX_RECORDING_MS);
    } catch (error) {
      reportClientError(error);
      Alert.alert(strings.assistant.voiceErrorTitle, strings.assistant.voiceErrorBody);
    } finally {
      setStarting(false);
    }
  };

  // Leaving the screen mid-recording must release the microphone.
  useEffect(
    () => () => {
      clearTimer();
      if (recorder.isRecording) void recorder.stop().catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggle = () => {
    if (state === 'transcribing') return;
    if (state === 'recording') void stop();
    else void start();
  };

  return { state, toggle };
}
