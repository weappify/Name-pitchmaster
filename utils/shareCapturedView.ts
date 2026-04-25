import type { RefObject } from 'react';
import { Alert, Share, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

type ShareCapturedViewOptions = {
  viewRef: RefObject<View | null>;
  title: string;
  message?: string;
};

export async function shareCapturedView({
  viewRef,
  title,
  message,
}: ShareCapturedViewOptions) {
  if (!viewRef.current) {
    Alert.alert('Export unavailable', 'The preview was not ready yet. Please try again.');
    return;
  }

  try {
    const imageUri = await captureRef(viewRef.current, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    await Share.share({
      title,
      message,
      url: imageUri,
    });
  } catch (error) {
    Alert.alert(
      'Export failed',
      error instanceof Error ? error.message : 'Unable to export the preview right now.'
    );
  }
}
