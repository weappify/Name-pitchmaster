import { getFriendlySupabaseErrorMessage } from '@/lib/supabaseErrors';
import { supabase } from '@/lib/supabase';

const PROFILE_IMAGE_BUCKET = 'profile-images';

function getFileExtension(fileName?: string | null, mimeType?: string | null) {
  const fileNameExtension = fileName?.split('.').pop()?.toLowerCase();

  if (fileNameExtension) {
    return fileNameExtension;
  }

  const mimeExtension = mimeType?.split('/').pop()?.toLowerCase();

  if (mimeExtension) {
    return mimeExtension === 'jpeg' ? 'jpg' : mimeExtension;
  }

  return 'jpg';
}

function getContentType(mimeType?: string | null) {
  return mimeType?.trim() || 'image/jpeg';
}

export function getProfileImageStoragePath(
  userId: string,
  asset: {
    fileName?: string | null;
    mimeType?: string | null;
  }
) {
  const extension = getFileExtension(asset.fileName, asset.mimeType);
  return `${userId}/avatar-${Date.now()}.${extension}`;
}

export function getProfileImagePublicUrl(storagePath: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadProfileImage(
  userId: string,
  asset: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
  }
) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const storagePath = getProfileImageStoragePath(userId, asset);
  const response = await fetch(asset.uri);
  const fileBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: getContentType(asset.mimeType),
    upsert: true,
  });

  if (error) {
    const friendlyMessage = getFriendlySupabaseErrorMessage(
      error,
      'Unable to upload profile photo.'
    );

    if (
      error.message.includes('Bucket not found') ||
      friendlyMessage.includes('Bucket not found')
    ) {
      throw new Error(
        'Profile photo storage is not set up yet. Create the public "profile-images" bucket in Supabase Storage and apply its upload policies.'
      );
    }

    if (
      error.message.toLowerCase().includes('permission') ||
      error.message.toLowerCase().includes('row-level security') ||
      friendlyMessage.toLowerCase().includes('permission')
    ) {
      throw new Error(
        'Profile photo upload is blocked by Supabase Storage permissions. Allow authenticated users to upload to the "profile-images" bucket.'
      );
    }

    throw new Error(friendlyMessage);
  }

  return {
    storagePath,
    publicUrl: getProfileImagePublicUrl(storagePath),
  };
}

export { PROFILE_IMAGE_BUCKET };
